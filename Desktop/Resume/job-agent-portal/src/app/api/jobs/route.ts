import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jobs, users } from '@/lib/db/schema'
import { jobFilterSchema } from '@/lib/validators/job-schema'
import {
  successResponse,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { eq, and, gte, lte, like, desc, asc, sql } from 'drizzle-orm'
import { parseResume } from '@/lib/ai/resume-parser'
import { calculateJobMatches } from '@/lib/ai/job-matcher'

/**
 * GET /api/jobs
 * List and filter jobs
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

    // Build query conditions
    const conditions = []

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

    // Execute query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Map filter orderBy field (snake_case) to schema field (camelCase)
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

    const results = await db
      .select()
      .from(jobs)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(filters.limit)
      .offset(filters.offset)

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(whereClause)

    const total = totalResult[0]?.count || 0

    // Calculate match scores if user has resume
    let jobsWithScores: any[] = results
    try {
      // Fetch user's resume
      const user = await db
        .select({ resumeText: users.resumeText })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (user[0]?.resumeText) {
        // Parse resume (consider caching this in production)
        const parsedResume = await parseResume(user[0].resumeText)

        // Calculate match scores for all jobs
        const matches = calculateJobMatches(results as any[], parsedResume)

        // Map back to jobs with scores
        jobsWithScores = matches.map(m => ({
          ...m.job,
          matchScore: m.matchScore,
          matchReasons: m.matchReasons,
        }))
      }
    } catch (matchError) {
      // If match scoring fails, return jobs without scores
      console.error('Match scoring error:', matchError)
    }

    return successResponse({
      jobs: jobsWithScores,
      total,
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
