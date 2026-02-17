import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jobs, searchProfiles } from '@/lib/db/schema'
import { jobFilterSchema } from '@/lib/validators/job-schema'
import {
  successResponse,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { eq, and, or, gte, lte, like, desc, asc, sql } from 'drizzle-orm'
import {
  buildKeywordGroups,
  findMatchingGroups,
  shouldExcludeJob,
  calculateKeywordScore,
  buildMatchReasons,
} from '@/lib/utils/keyword-matcher'

/**
 * GET /api/jobs
 * List and filter jobs — strict keyword matching against user's search profiles.
 * Only returns jobs whose title matches keywords from the user's profile jobTitles.
 * Uses SQL LIKE for initial fetch, then JS word-boundary matching for accuracy.
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and get user ID
    const userId = await getUserIdFromRequest(request)

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const params = Object.fromEntries(searchParams.entries())

    // Validate with Zod
    const validation = jobFilterSchema.safeParse({
      ...params,
      limit: params.limit ? parseInt(params.limit) : undefined,
      offset: params.offset ? parseInt(params.offset) : undefined,
      minSalary: params.minSalary ? parseFloat(params.minSalary) : undefined,
      maxSalary: params.maxSalary ? parseFloat(params.maxSalary) : undefined,
      isRemote: params.isRemote ? params.isRemote === 'true' : undefined,
    })

    if (!validation.success) {
      return badRequestResponse('Invalid filter parameters')
    }

    const filters = validation.data

    // ── Fetch user's active search profiles ───────────────────────────
    const userProfiles = await db
      .select()
      .from(searchProfiles)
      .where(
        and(
          eq(searchProfiles.userId, userId),
          eq(searchProfiles.isActive, true)
        )
      )

    // Parse JSON fields from profiles (only jobTitles for title matching,
    // excludeKeywords for filtering out unwanted jobs)
    const parsedProfiles = userProfiles.map(p => ({
      name: p.name,
      jobTitles: JSON.parse(p.jobTitles || '[]') as string[],
      excludeKeywords: JSON.parse(p.excludeKeywords || '[]') as string[],
    }))

    // Build keyword groups from jobTitles only (not includeKeywords —
    // those are employment qualifiers like "W2"/"C2C", not role keywords)
    const keywordGroups = buildKeywordGroups(parsedProfiles)

    // Collect all exclude keywords across profiles
    const allExcludeKeywords = parsedProfiles.flatMap(p => p.excludeKeywords)

    // If no profiles or no keywords, return empty — user needs profiles to see jobs
    if (keywordGroups.length === 0) {
      return successResponse({
        jobs: [],
        total: 0,
        limit: filters.limit,
        offset: filters.offset,
      })
    }

    // ── Build SQL conditions ──────────────────────────────────────────
    // SQL LIKE is a broad pre-filter (substring matching).
    // JS word-boundary matching is applied after fetch for accuracy.
    const profileConditions = keywordGroups.map(group => {
      const wordConditions = group.words.map(word =>
        sql`LOWER(${jobs.title}) LIKE ${'%' + word + '%'}`
      )
      return and(...wordConditions)
    })

    const profileFilter = or(...profileConditions)

    const conditions = []

    if (profileFilter) {
      conditions.push(profileFilter)
    }

    if (filters.platform) {
      conditions.push(eq(jobs.platform, filters.platform))
    }

    if (filters.isRemote !== undefined) {
      conditions.push(eq(jobs.isRemote, filters.isRemote))
    }

    if (filters.employmentType) {
      conditions.push(eq(jobs.employmentType, filters.employmentType))
    }

    if (filters.company) {
      conditions.push(like(jobs.company, `%${filters.company}%`))
    }

    if (filters.location) {
      conditions.push(like(jobs.location, `%${filters.location}%`))
    }

    if (filters.search) {
      conditions.push(
        sql`(
          ${jobs.title} LIKE ${'%' + filters.search + '%'} OR
          ${jobs.company} LIKE ${'%' + filters.search + '%'} OR
          ${jobs.description} LIKE ${'%' + filters.search + '%'}
        )`
      )
    }

    if (filters.minSalary) {
      conditions.push(gte(jobs.salaryMin, filters.minSalary))
    }

    if (filters.maxSalary) {
      conditions.push(lte(jobs.salaryMax, filters.maxSalary))
    }

    if (filters.postedAfter) {
      conditions.push(gte(jobs.postedAt, filters.postedAfter))
    }

    if (filters.postedBefore) {
      conditions.push(lte(jobs.postedAt, filters.postedBefore))
    }

    // Execute query — fetch more than needed since JS filter may remove some
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const orderByFieldMap = {
      'posted_at': jobs.postedAt,
      'created_at': jobs.createdAt,
      'salary_max': jobs.salaryMax,
    } as const

    const orderByField = orderByFieldMap[filters.orderBy] || jobs.postedAt

    const orderByClause =
      filters.orderDir === 'asc'
        ? asc(orderByField)
        : desc(orderByField)

    // Over-fetch to account for JS word-boundary filtering removing false positives
    const overFetchLimit = filters.limit * 3

    const results = await db
      .select()
      .from(jobs)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(overFetchLimit)
      .offset(filters.offset)

    // ── JS word-boundary filter (removes false positives from SQL LIKE) ─
    const strictMatched = results.filter(job => {
      // Must match at least one keyword group with word-boundary matching
      const matchingGroups = findMatchingGroups(job.title, keywordGroups)
      if (matchingGroups.length === 0) return false

      // Exclude jobs matching any excluded keyword
      if (shouldExcludeJob(job.title, job.description || '', allExcludeKeywords)) {
        return false
      }

      return true
    })

    // Apply pagination limit after strict filtering
    const paginatedResults = strictMatched.slice(0, filters.limit)

    // Get accurate total count — count all strict matches
    const allResults = await db
      .select({ id: jobs.id, title: jobs.title, description: jobs.description })
      .from(jobs)
      .where(whereClause)

    const totalStrict = allResults.filter(job => {
      const matchingGroups = findMatchingGroups(job.title, keywordGroups)
      if (matchingGroups.length === 0) return false
      if (shouldExcludeJob(job.title, job.description || '', allExcludeKeywords)) return false
      return true
    }).length

    // ── Calculate keyword match scores ────────────────────────────────
    const jobsWithScores = paginatedResults.map(job => {
      const matchingGroups = findMatchingGroups(job.title, keywordGroups)
      const score = calculateKeywordScore(job.title, matchingGroups)
      const reasons = buildMatchReasons(matchingGroups)

      return {
        ...job,
        matchScore: score,
        matchReasons: reasons.length > 0 ? reasons : ['Matches your search profiles'],
      }
    })

    // Sort by match score (highest first) then by posted date
    jobsWithScores.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
      return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    })

    return successResponse({
      jobs: jobsWithScores,
      total: totalStrict,
      limit: filters.limit,
      offset: filters.offset,
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('GET /api/jobs error:', error)
    return serverErrorResponse('Failed to fetch jobs')
  }
}
