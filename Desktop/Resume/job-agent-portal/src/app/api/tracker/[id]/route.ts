import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jobApplications, jobs } from '@/lib/db/schema'
import { updateApplicationSchema } from '@/lib/validators/tracker-schema'
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
 * GET /api/tracker/:id
 * Get a single job application
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    const applicationId = params.id

    const results = await db
      .select({
        application: jobApplications,
        job: jobs,
      })
      .from(jobApplications)
      .leftJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .where(eq(jobApplications.id, applicationId))
      .limit(1)

    if (!results.length) {
      return notFoundResponse('Application not found')
    }

    const { application, job } = results[0]

    // Ensure user owns this application
    if (application.userId !== userId) {
      return forbiddenResponse('You do not have permission to access this application')
    }

    // Parse JSON fields
    const parsedApplication = {
      ...application,
      interviewDates: JSON.parse(application.interviewDates || '[]'),
      offerDetails: application.offerDetails ? JSON.parse(application.offerDetails) : null,
      job,
    }

    return successResponse(parsedApplication)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('GET /api/tracker/:id error:', error)
    return serverErrorResponse('Failed to fetch application')
  }
}

/**
 * PATCH /api/tracker/:id
 * Update a job application
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    const applicationId = params.id
    const body = await request.json()

    // Validate input
    const validation = updateApplicationSchema.safeParse(body)

    if (!validation.success) {
      return badRequestResponse('Invalid application data')
    }

    const data = validation.data

    // Check if application exists and user owns it
    const [existingApplication] = await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.id, applicationId))
      .limit(1)

    if (!existingApplication) {
      return notFoundResponse('Application not found')
    }

    if (existingApplication.userId !== userId) {
      return forbiddenResponse('You do not have permission to update this application')
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: sql`(datetime('now'))`,
    }

    if (data.status !== undefined) updateData.status = data.status
    if (data.appliedAt !== undefined) updateData.appliedAt = data.appliedAt
    if (data.appliedVia !== undefined) updateData.appliedVia = data.appliedVia
    if (data.resumeId !== undefined) updateData.resumeId = data.resumeId
    if (data.coverLetterId !== undefined) updateData.coverLetterId = data.coverLetterId
    if (data.followUpDate !== undefined) updateData.followUpDate = data.followUpDate
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.interviewDates !== undefined)
      updateData.interviewDates = JSON.stringify(data.interviewDates)
    if (data.offerDetails !== undefined)
      updateData.offerDetails = JSON.stringify(data.offerDetails)
    if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason

    // Update application
    const [updatedApplication] = await db
      .update(jobApplications)
      .set(updateData)
      .where(
        and(eq(jobApplications.id, applicationId), eq(jobApplications.userId, userId))
      )
      .returning()

    // Parse JSON fields for response
    const parsedApplication = {
      ...updatedApplication,
      interviewDates: JSON.parse(updatedApplication.interviewDates || '[]'),
      offerDetails: updatedApplication.offerDetails
        ? JSON.parse(updatedApplication.offerDetails)
        : null,
    }

    return successResponse(parsedApplication, 'Application updated successfully')
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('PATCH /api/tracker/:id error:', error)
    return serverErrorResponse('Failed to update application')
  }
}

/**
 * DELETE /api/tracker/:id
 * Delete a job application
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    const applicationId = params.id

    // Check if application exists and user owns it
    const [existingApplication] = await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.id, applicationId))
      .limit(1)

    if (!existingApplication) {
      return notFoundResponse('Application not found')
    }

    if (existingApplication.userId !== userId) {
      return forbiddenResponse('You do not have permission to delete this application')
    }

    // Delete application
    await db
      .delete(jobApplications)
      .where(
        and(eq(jobApplications.id, applicationId), eq(jobApplications.userId, userId))
      )

    return successResponse({ id: applicationId }, 'Application deleted successfully')
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('DELETE /api/tracker/:id error:', error)
    return serverErrorResponse('Failed to delete application')
  }
}
