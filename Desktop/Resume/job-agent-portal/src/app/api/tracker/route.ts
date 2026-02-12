import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jobApplications, jobs } from '@/lib/db/schema'
import {
  createApplicationSchema,
  applicationFilterSchema,
} from '@/lib/validators/tracker-schema'
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { eq, and, gte, lte, like, desc, asc, sql } from 'drizzle-orm'

/**
 * GET /api/tracker
 * List and filter job applications
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const params = Object.fromEntries(searchParams.entries())

    // Validate with Zod
    const validation = applicationFilterSchema.safeParse({
      ...params,
      limit: params.limit ? parseInt(params.limit) : undefined,
      offset: params.offset ? parseInt(params.offset) : undefined,
    })

    if (!validation.success) {
      return badRequestResponse('Invalid filter parameters')
    }

    const filters = validation.data

    // Build query conditions
    const conditions = [eq(jobApplications.userId, userId)]

    if (filters.status) {
      conditions.push(eq(jobApplications.status, filters.status))
    }

    if (filters.profileId) {
      conditions.push(eq(jobApplications.profileId, filters.profileId))
    }

    if (filters.followUpBefore) {
      conditions.push(lte(jobApplications.followUpDate, filters.followUpBefore))
    }

    if (filters.followUpAfter) {
      conditions.push(gte(jobApplications.followUpDate, filters.followUpAfter))
    }

    if (filters.appliedBefore) {
      conditions.push(lte(jobApplications.appliedAt, filters.appliedBefore))
    }

    if (filters.appliedAfter) {
      conditions.push(gte(jobApplications.appliedAt, filters.appliedAfter))
    }

    if (filters.search) {
      conditions.push(like(jobApplications.notes, `%${filters.search}%`))
    }

    // Execute query with job details
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const orderByColumn =
      filters.orderBy === 'created_at'
        ? jobApplications.createdAt
        : filters.orderBy === 'updated_at'
          ? jobApplications.updatedAt
          : filters.orderBy === 'applied_at'
            ? jobApplications.appliedAt
            : jobApplications.followUpDate

    const orderByClause =
      filters.orderDir === 'asc' ? asc(orderByColumn) : desc(orderByColumn)

    const results = await db
      .select({
        application: jobApplications,
        job: jobs,
      })
      .from(jobApplications)
      .leftJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(filters.limit)
      .offset(filters.offset)

    // Parse JSON fields
    const parsedResults = results.map(({ application, job }) => ({
      ...application,
      interviewDates: JSON.parse(application.interviewDates || '[]'),
      offerDetails: application.offerDetails ? JSON.parse(application.offerDetails) : null,
      job,
    }))

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobApplications)
      .where(whereClause)

    const total = totalResult[0]?.count || 0

    return successResponse({
      applications: parsedResults,
      total,
      limit: filters.limit,
      offset: filters.offset,
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('GET /api/tracker error:', error)
    return serverErrorResponse('Failed to fetch applications')
  }
}

/**
 * POST /api/tracker
 * Create a new job application entry
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    const body = await request.json()

    // Validate input
    const validation = createApplicationSchema.safeParse(body)

    if (!validation.success) {
      return badRequestResponse('Invalid application data')
    }

    const data = validation.data

    // Verify job exists
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, data.jobId))
      .limit(1)

    if (!job) {
      return badRequestResponse('Job not found')
    }

    // Insert application
    const [newApplication] = await db
      .insert(jobApplications)
      .values({
        userId,
        jobId: data.jobId,
        profileId: data.profileId,
        status: data.status,
        notes: data.notes,
      })
      .returning()

    // Parse JSON fields for response
    const parsedApplication = {
      ...newApplication,
      interviewDates: JSON.parse(newApplication.interviewDates || '[]'),
      offerDetails: newApplication.offerDetails
        ? JSON.parse(newApplication.offerDetails)
        : null,
    }

    return createdResponse(parsedApplication, 'Application tracked successfully')
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('POST /api/tracker error:', error)
    return serverErrorResponse('Failed to create application')
  }
}
