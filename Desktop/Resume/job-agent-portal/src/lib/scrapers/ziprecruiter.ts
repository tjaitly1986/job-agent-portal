import { BaseScraper } from './base-scraper'
import { ScrapedJob, ScrapeOptions, ScrapeResult } from '../mcp/types'

/**
 * ZipRecruiter job scraper (stub)
 * Implementation pending
 */
export class ZipRecruiterScraper extends BaseScraper {
  constructor() {
    super('ziprecruiter')
  }

  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    this.log(`ZipRecruiter scraping not yet implemented for query: "${options.searchQuery}"`)

    return {
      jobs: [],
      totalFound: 0,
      newJobs: 0,
      errors: ['ZipRecruiter scraper not yet implemented'],
    }
  }

  protected buildSearchUrl(options: ScrapeOptions): string {
    const params = new URLSearchParams()
    params.set('search', options.searchQuery)
    if (options.location) params.set('location', options.location)
    return `https://www.ziprecruiter.com/jobs-search?${params.toString()}`
  }

  protected parseJobListing(_html: string, _url: string): Partial<ScrapedJob> | null {
    return null
  }
}
