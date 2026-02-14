import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { outreachRecords } from '@/lib/db/schema'
import { createOutreachRecordSchema } from '@/lib/validators/outreach-schema'
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { eq, desc, asc, sql } from 'drizzle-orm'

/**
 * GET /api/outreach
 * List outreach records for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const orderDir = searchParams.get('orderDir') === 'asc' ? 'asc' : 'desc'

    const orderByClause =
      orderDir === 'asc' ? asc(outreachRecords.createdAt) : desc(outreachRecords.createdAt)

    const results = await db
      .select()
      .from(outreachRecords)
      .where(eq(outreachRecords.userId, userId))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(outreachRecords)
      .where(eq(outreachRecords.userId, userId))

    const total = totalResult[0]?.count || 0

    return successResponse({
      records: results,
      total,
      limit,
      offset,
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('GET /api/outreach error:', error)
    return serverErrorResponse('Failed to fetch outreach records')
  }
}

/**
 * POST /api/outreach
 * Create a new outreach record
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    const body = await request.json()

    const validation = createOutreachRecordSchema.safeParse(body)

    if (!validation.success) {
      return badRequestResponse('Invalid outreach data')
    }

    const data = validation.data

    const [newRecord] = await db
      .insert(outreachRecords)
      .values({
        userId,
        jobDescription: data.jobDescription,
        jobTitle: data.jobTitle,
        company: data.company,
        recruiterName: data.recruiterName,
        prerequisites: data.prerequisites,
        tone: data.tone,
        linkedinMessage: data.linkedinMessage,
        emailMessage: data.emailMessage,
        resumeUrl: data.resumeUrl,
        coverLetterUrl: data.coverLetterUrl,
      })
      .returning()

    return createdResponse(newRecord, 'Outreach record saved')
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('POST /api/outreach error:', error)
    return serverErrorResponse('Failed to save outreach record')
  }
}
