import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { resumes } from '@/lib/db/schema'
import { updateResumeSchema } from '@/lib/validators/resume-schema'
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { eq, and, sql } from 'drizzle-orm'
import fs from 'fs/promises'

/**
 * GET /api/resumes/:id
 * Get a single resume
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    const resumeId = params.id

    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, resumeId))
      .limit(1)

    if (!resume) {
      return notFoundResponse('Resume not found')
    }

    // Ensure user owns this resume
    if (resume.userId !== userId) {
      return forbiddenResponse('You do not have permission to access this resume')
    }

    return successResponse(resume)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('GET /api/resumes/:id error:', error)
    return serverErrorResponse('Failed to fetch resume')
  }
}

/**
 * PATCH /api/resumes/:id
 * Update a resume (label, isDefault)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    const resumeId = params.id
    const body = await request.json()

    // Validate input
    const validation = updateResumeSchema.safeParse(body)

    if (!validation.success) {
      return badRequestResponse('Invalid resume data')
    }

    const data = validation.data

    // Check if resume exists and user owns it
    const [existingResume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, resumeId))
      .limit(1)

    if (!existingResume) {
      return notFoundResponse('Resume not found')
    }

    if (existingResume.userId !== userId) {
      return forbiddenResponse('You do not have permission to update this resume')
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(resumes)
        .set({ isDefault: false })
        .where(eq(resumes.userId, userId))
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: sql`(datetime('now'))`,
    }

    if (data.label !== undefined) updateData.label = data.label
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault

    // Update resume
    const [updatedResume] = await db
      .update(resumes)
      .set(updateData)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
      .returning()

    return successResponse(updatedResume, 'Resume updated successfully')
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('PATCH /api/resumes/:id error:', error)
    return serverErrorResponse('Failed to update resume')
  }
}

/**
 * DELETE /api/resumes/:id
 * Delete a resume
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    const resumeId = params.id

    // Check if resume exists and user owns it
    const [existingResume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, resumeId))
      .limit(1)

    if (!existingResume) {
      return notFoundResponse('Resume not found')
    }

    if (existingResume.userId !== userId) {
      return forbiddenResponse('You do not have permission to delete this resume')
    }

    // Delete file from disk
    try {
      await fs.unlink(existingResume.filePath)
    } catch (fileError) {
      console.error('Error deleting file:', fileError)
      // Continue anyway - database cleanup is more important
    }

    // Delete resume record
    await db
      .delete(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))

    return successResponse({ id: resumeId }, 'Resume deleted successfully')
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('DELETE /api/resumes/:id error:', error)
    return serverErrorResponse('Failed to delete resume')
  }
}
