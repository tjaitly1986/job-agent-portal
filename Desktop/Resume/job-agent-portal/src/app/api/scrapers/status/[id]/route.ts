import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { scrapeRuns, scrapeLogs } from '@/lib/db/schema'
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { eq } from 'drizzle-orm'

/**
 * GET /api/scrapers/status/:id
 * Get status of a specific scrape run
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    const scrapeRunId = params.id

    // Fetch scrape run
    const [scrapeRun] = await db
      .select()
      .from(scrapeRuns)
      .where(eq(scrapeRuns.id, scrapeRunId))
      .limit(1)

    if (!scrapeRun) {
      return notFoundResponse('Scrape run not found')
    }

    // Ensure user owns this scrape run (or is admin)
    if (scrapeRun.userId && scrapeRun.userId !== userId) {
      return forbiddenResponse('You do not have permission to access this scrape run')
    }

    // Fetch associated logs
    const logs = await db
      .select()
      .from(scrapeLogs)
      .where(eq(scrapeLogs.scrapeRunId, scrapeRunId))

    // Parse JSON fields
    const parsedScrapeRun = {
      ...scrapeRun,
      platforms: JSON.parse(scrapeRun.platforms || '[]'),
      profilesUsed: JSON.parse(scrapeRun.profilesUsed || '[]'),
      errorSummary: scrapeRun.errorSummary ? JSON.parse(scrapeRun.errorSummary) : null,
      logs,
    }

    return successResponse(parsedScrapeRun)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('GET /api/scrapers/status/:id error:', error)
    return serverErrorResponse('Failed to fetch scrape status')
  }
}
