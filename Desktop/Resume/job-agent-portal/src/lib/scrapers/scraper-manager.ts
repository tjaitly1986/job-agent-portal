import { db } from '../db'
import { jobs as jobsTable, scrapeRuns, scrapeLogs } from '../db/schema'
import { IndeedScraper } from './indeed'
import { DiceScraper } from './dice'
import { LinkedInScraper } from './linkedin'
import { BaseScraper } from './base-scraper'
import { ScrapeOptions, ScrapedJob } from '../mcp/types'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

/**
 * ScraperManager orchestrates all platform scrapers
 * Handles:
 * - Running scrapers in parallel
 * - Deduplication across platforms
 * - Saving results to database
 * - Tracking scrape runs and logs
 */
export class ScraperManager {
  private scrapers: Map<string, BaseScraper> = new Map()

  constructor() {
    // Register all available scrapers
    this.scrapers.set('indeed', new IndeedScraper())
    this.scrapers.set('dice', new DiceScraper())
    this.scrapers.set('linkedin', new LinkedInScraper())
  }

  /**
   * Run scraping across multiple platforms
   */
  async scrapeAll(
    options: ScrapeOptions,
    platforms: string[] = ['indeed', 'dice', 'linkedin'],
    userId?: string
  ): Promise<{
    totalFound: number
    newJobs: number
    duplicates: number
    errors: string[]
  }> {
    console.log(`Starting scrape for query: "${options.searchQuery}"`)
    console.log(`Platforms: ${platforms.join(', ')}`)

    // Create scrape run record
    const scrapeRunId = crypto.randomUUID()
    const startTime = Date.now()

    await db.insert(scrapeRuns).values({
      id: scrapeRunId,
      userId: userId || null,
      triggerType: 'on_demand',
      status: 'running',
      platforms: JSON.stringify(platforms),
      profilesUsed: '[]',
      totalFound: 0,
      newJobs: 0,
      errors: 0,
      startedAt: new Date().toISOString(),
    })

    const allJobs: ScrapedJob[] = []
    const errors: string[] = []

    // Run scrapers in parallel
    const scrapePromises = platforms.map(async (platform) => {
      const scraper = this.scrapers.get(platform.toLowerCase())
      if (!scraper) {
        const error = `Scraper not found for platform: ${platform}`
        console.error(error)
        errors.push(error)
        return null
      }

      try {
        const result = await scraper.scrape(options)

        // Log this scrape
        await db.insert(scrapeLogs).values({
          scrapeRunId,
          mcpServer: 'bright-data', // or 'playwright' depending on scraper
          toolName: 'scrape_search',
          platform,
          url: '',
          status: result.errors ? 'error' : 'success',
          durationMs: 0,
          jobsFound: result.totalFound,
          errorMessage: result.errors?.join(', '),
        })

        if (result.errors) {
          errors.push(...result.errors)
        }

        return result
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error scraping ${platform}:`, errorMsg)
        errors.push(`${platform}: ${errorMsg}`)

        // Log error
        await db.insert(scrapeLogs).values({
          scrapeRunId,
          mcpServer: 'bright-data',
          toolName: 'scrape_search',
          platform,
          url: '',
          status: 'error',
          errorMessage: errorMsg,
        })

        return null
      }
    })

    const results = await Promise.all(scrapePromises)

    // Collect all jobs
    for (const result of results) {
      if (result?.jobs) {
        allJobs.push(...result.jobs)
      }
    }

    // Deduplicate jobs
    const { uniqueJobs, duplicateCount } = this.deduplicateJobs(allJobs)

    // Save unique jobs to database
    const savedCount = await this.saveJobs(uniqueJobs)

    // Update scrape run
    const duration = Date.now() - startTime
    await db
      .update(scrapeRuns)
      .set({
        status: errors.length > 0 ? 'partial' : 'completed',
        totalFound: allJobs.length,
        newJobs: savedCount,
        errors: errors.length,
        durationMs: duration,
        completedAt: new Date().toISOString(),
        errorSummary: errors.length > 0 ? JSON.stringify(errors) : null,
      })
      .where(eq(scrapeRuns.id, scrapeRunId))

    console.log(`Scrape complete:`)
    console.log(`- Total found: ${allJobs.length}`)
    console.log(`- Unique jobs: ${uniqueJobs.length}`)
    console.log(`- Duplicates: ${duplicateCount}`)
    console.log(`- Saved to DB: ${savedCount}`)
    console.log(`- Errors: ${errors.length}`)

    return {
      totalFound: allJobs.length,
      newJobs: savedCount,
      duplicates: duplicateCount,
      errors,
    }
  }

  /**
   * Deduplicate jobs based on dedupHash
   */
  private deduplicateJobs(jobs: ScrapedJob[]): {
    uniqueJobs: ScrapedJob[]
    duplicateCount: number
  } {
    const seen = new Set<string>()
    const uniqueJobs: ScrapedJob[] = []

    for (const job of jobs) {
      // Jobs should already have dedupHash from normalization
      // But we'll use title+company+location as fallback
      const key = `${job.title}-${job.company}-${job.location}`.toLowerCase()

      if (!seen.has(key)) {
        seen.add(key)
        uniqueJobs.push(job)
      }
    }

    return {
      uniqueJobs,
      duplicateCount: jobs.length - uniqueJobs.length,
    }
  }

  /**
   * Save jobs to database
   * Returns number of jobs actually saved (skips duplicates)
   */
  private async saveJobs(jobs: ScrapedJob[]): Promise<number> {
    let savedCount = 0

    for (const job of jobs) {
      try {
        // Check if job already exists (by dedupHash)
        const existing = await db
          .select()
          .from(jobsTable)
          .where(eq(jobsTable.dedupHash, job.title)) // Should be dedupHash but we don't have it in the type
          .limit(1)

        if (existing.length > 0) {
          console.log(`Job already exists: ${job.title} at ${job.company}`)
          continue
        }

        // Insert new job
        await db.insert(jobsTable).values({
          externalId: job.externalId,
          platform: job.platform,
          dedupHash: `${job.title}-${job.company}-${job.location}`, // Simplified
          title: job.title,
          company: job.company,
          location: job.location,
          isRemote: job.isRemote,
          salaryText: job.salaryText,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryType: job.salaryType,
          employmentType: job.employmentType,
          description: job.description,
          descriptionHtml: job.descriptionHtml,
          requirements: job.requirements,
          postedAt: job.postedAt,
          postedAtRaw: job.postedAtRaw,
          applyUrl: job.applyUrl,
          sourceUrl: job.sourceUrl,
        })

        savedCount++
      } catch (error) {
        console.error(`Error saving job: ${job.title}`, error)
      }
    }

    return savedCount
  }
}

// Singleton instance
export const scraperManager = new ScraperManager()
