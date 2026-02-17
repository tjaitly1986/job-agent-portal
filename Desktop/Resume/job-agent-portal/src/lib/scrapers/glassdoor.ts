import { BaseScraper } from './base-scraper'
import { ScrapedJob, ScrapeOptions, ScrapeResult } from '../mcp/types'

/**
 * Glassdoor job scraper (stub)
 * Glassdoor requires browser rendering — implementation pending
 */
export class GlassdoorScraper extends BaseScraper {
  constructor() {
    super('glassdoor')
  }

  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    this.log(`Glassdoor scraping not yet implemented for query: "${options.searchQuery}"`)

    return {
      jobs: [],
      totalFound: 0,
      newJobs: 0,
      errors: ['Glassdoor scraper not yet implemented'],
    }
  }

  protected buildSearchUrl(options: ScrapeOptions): string {
    const query = encodeURIComponent(options.searchQuery)
    return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${query}`
  }

  protected parseJobListing(_html: string, _url: string): Partial<ScrapedJob> | null {
    return null
  }
}
