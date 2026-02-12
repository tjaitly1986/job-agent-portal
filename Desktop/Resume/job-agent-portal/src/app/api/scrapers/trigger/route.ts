import { NextRequest } from 'next/server'
import { ScraperManager } from '@/lib/scrapers/scraper-manager'
import { triggerScrapeSchema } from '@/lib/validators/scraper-schema'
import {
  successResponse,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'

/**
 * POST /api/scrapers/trigger
 * Trigger on-demand job scraping
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    const body = await request.json()

    // Validate input
    const validation = triggerScrapeSchema.safeParse(body)

    if (!validation.success) {
      return badRequestResponse('Invalid scrape parameters')
    }

    const data = validation.data

    // Create scraper manager and trigger scraping
    const scraperManager = new ScraperManager()

    const result = await scraperManager.scrapeAll(
      {
        searchQuery: data.searchQuery,
        location: data.location,
        maxResults: data.maxResults,
        postedWithin: data.postedWithin,
        remote: data.remote,
        employmentTypes: data.employmentTypes,
      },
      data.platforms,
      userId
    )

    return successResponse(
      {
        totalFound: result.totalFound,
        newJobs: result.newJobs,
        duplicates: result.duplicates,
        errors: result.errors,
        platforms: data.platforms,
        query: data.searchQuery,
      },
      'Scraping completed'
    )
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('POST /api/scrapers/trigger error:', error)
    return serverErrorResponse('Failed to trigger scraping')
  }
}
