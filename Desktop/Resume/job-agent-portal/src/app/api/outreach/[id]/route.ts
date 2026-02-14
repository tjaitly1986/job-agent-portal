import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { outreachRecords } from '@/lib/db/schema'
import { updateOutreachRecordSchema } from '@/lib/validators/outreach-schema'
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { eq, and, sql } from 'drizzle-orm'

/**
 * GET /api/outreach/:id
 * Get a single outreach record
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    const { id } = await params

    const [record] = await db
      .select()
      .from(outreachRecords)
      .where(eq(outreachRecords.id, id))
      .limit(1)

    if (!record) {
      return notFoundResponse('Outreach record not found')
    }

    if (record.userId !== userId) {
      return forbiddenResponse('You do not have permission to access this record')
    }

    return successResponse(record)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('GET /api/outreach/:id error:', error)
    return serverErrorResponse('Failed to fetch outreach record')
  }
}

/**
 * PATCH /api/outreach/:id
 * Update an outreach record (e.g., attach document URLs)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    const { id } = await params
    const body = await request.json()

    const validation = updateOutreachRecordSchema.safeParse(body)

    if (!validation.success) {
      return badRequestResponse('Invalid outreach data')
    }

    const data = validation.data

    const [existing] = await db
      .select()
      .from(outreachRecords)
      .where(eq(outreachRecords.id, id))
      .limit(1)

    if (!existing) {
      return notFoundResponse('Outreach record not found')
    }

    if (existing.userId !== userId) {
      return forbiddenResponse('You do not have permission to update this record')
    }

    const updateData: Record<string, unknown> = {
      updatedAt: sql`(datetime('now'))`,
    }

    if (data.linkedinMessage !== undefined) updateData.linkedinMessage = data.linkedinMessage
    if (data.emailMessage !== undefined) updateData.emailMessage = data.emailMessage
    if (data.resumeUrl !== undefined) updateData.resumeUrl = data.resumeUrl
    if (data.coverLetterUrl !== undefined) updateData.coverLetterUrl = data.coverLetterUrl

    const [updated] = await db
      .update(outreachRecords)
      .set(updateData)
      .where(and(eq(outreachRecords.id, id), eq(outreachRecords.userId, userId)))
      .returning()

    return successResponse(updated, 'Outreach record updated')
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('PATCH /api/outreach/:id error:', error)
    return serverErrorResponse('Failed to update outreach record')
  }
}

/**
 * DELETE /api/outreach/:id
 * Delete an outreach record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    const { id } = await params

    const [existing] = await db
      .select()
      .from(outreachRecords)
      .where(eq(outreachRecords.id, id))
      .limit(1)

    if (!existing) {
      return notFoundResponse('Outreach record not found')
    }

    if (existing.userId !== userId) {
      return forbiddenResponse('You do not have permission to delete this record')
    }

    await db
      .delete(outreachRecords)
      .where(and(eq(outreachRecords.id, id), eq(outreachRecords.userId, userId)))

    return successResponse({ id }, 'Outreach record deleted')
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('DELETE /api/outreach/:id error:', error)
    return serverErrorResponse('Failed to delete outreach record')
  }
}
