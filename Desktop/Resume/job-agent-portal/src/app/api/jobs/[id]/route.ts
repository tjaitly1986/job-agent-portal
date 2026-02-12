import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jobs } from '@/lib/db/schema'
import {
  successResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { requireAuthApi } from '@/lib/api/auth'
import { eq } from 'drizzle-orm'

/**
 * GET /api/jobs/:id
 * Get a single job by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    await requireAuthApi(request)

    const jobId = params.id

    // Fetch job
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1)

    if (!job) {
      return notFoundResponse('Job not found')
    }

    return successResponse(job)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('GET /api/jobs/:id error:', error)
    return serverErrorResponse('Failed to fetch job')
  }
}
