import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { scrapeRuns } from '@/lib/db/schema'
import { successResponse, serverErrorResponse } from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { eq, desc } from 'drizzle-orm'

/**
 * GET /api/scrapers/runs
 * List recent scrape runs for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)

    // Get limit from query params (default 20, max 100)
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20'),
      100
    )

    // Fetch user's scrape runs
    const runs = await db
      .select()
      .from(scrapeRuns)
      .where(eq(scrapeRuns.userId, userId))
      .orderBy(desc(scrapeRuns.startedAt))
      .limit(limit)

    // Parse JSON fields
    const parsedRuns = runs.map((run) => ({
      ...run,
      platforms: JSON.parse(run.platforms || '[]'),
      profilesUsed: JSON.parse(run.profilesUsed || '[]'),
      errorSummary: run.errorSummary ? JSON.parse(run.errorSummary) : null,
    }))

    return successResponse(parsedRuns)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('GET /api/scrapers/runs error:', error)
    return serverErrorResponse('Failed to fetch scrape runs')
  }
}
