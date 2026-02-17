import { BaseScraper } from './base-scraper'
import { ScrapedJob, ScrapeOptions, ScrapeResult } from '../mcp/types'
import { brightDataClient } from '../mcp/bright-data'
import * as cheerio from 'cheerio'

/**
 * LinkedIn job scraper
 * Uses the guest jobs API (no login required) at /jobs-guest/jobs/api/
 * MUST use Bright Data residential proxies (LinkedIn blocks datacenter IPs)
 */
export class LinkedInScraper extends BaseScraper {
  constructor() {
    super('linkedin')
    this.rateLimitEnabled = true
  }

  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    this.log(`Starting scrape with query: "${options.searchQuery}"`)

    if (!brightDataClient.isConfigured()) {
      this.log('Bright Data not configured - LinkedIn requires residential proxy', 'error')
      return {
        jobs: [],
        totalFound: 0,
        newJobs: 0,
        errors: ['Bright Data not configured - LinkedIn requires residential proxy access'],
      }
    }

    const jobs: ScrapedJob[] = []
    const errors: string[] = []
    const maxResults = options.maxResults || 25
    const resultsPerPage = 25

    try {
      const maxPages = Math.ceil(maxResults / resultsPerPage)

      for (let page = 0; page < maxPages; page++) {
        await this.waitForRateLimit()

        const start = page * resultsPerPage
        const url = this.buildGuestApiUrl(options, start)
        this.log(`Fetching page ${page + 1} (start=${start}): ${url}`)

        // LinkedIn MUST use residential proxies
        const html = await brightDataClient.fetchHtml(url, { residential: true })
        const pageJobs = this.parseGuestApiResponse(html)
        this.log(`Found ${pageJobs.length} jobs on page ${page + 1}`)

        for (const partialJob of pageJobs) {
          const normalized = this.normalizeJob(partialJob, options.postedWithin)
          if (normalized) {
            jobs.push(normalized)
          }
        }

        if (jobs.length >= maxResults || pageJobs.length === 0) break
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Scrape error: ${errorMsg}`, 'error')
      errors.push(errorMsg)
    }

    this.log(`Scrape complete: ${jobs.length} jobs found`)

    return {
      jobs: jobs.slice(0, maxResults),
      totalFound: jobs.length,
      newJobs: jobs.length,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * Build URL for LinkedIn's guest jobs API (no auth needed)
   */
  private buildGuestApiUrl(options: ScrapeOptions, start: number = 0): string {
    const params = new URLSearchParams()
    params.set('keywords', options.searchQuery)
    params.set('start', start.toString())
    params.set('trk', 'public_jobs_jobs-search-bar_search-submit')

    if (options.location) {
      params.set('location', options.location)
    }

    // US geoId
    params.set('geoId', '103644278')

    if (options.remote) {
      params.set('f_WT', '2')
    }

    if (options.postedWithin === '24h') {
      params.set('f_TPR', 'r86400')
    } else if (options.postedWithin === '3d') {
      params.set('f_TPR', 'r259200')
    } else if (options.postedWithin === '7d') {
      params.set('f_TPR', 'r604800')
    } else if (options.postedWithin === '14d') {
      params.set('f_TPR', 'r1209600')
    }

    if (options.employmentTypes?.includes('contract')) {
      params.set('f_JT', 'C')
    }

    return `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`
  }

  /**
   * Parse the guest API HTML response
   * The API returns HTML fragments containing job cards
   */
  private parseGuestApiResponse(html: string): Partial<ScrapedJob>[] {
    const results: Partial<ScrapedJob>[] = []
    const $ = cheerio.load(html)

    $('li, .base-card, .job-search-card, .base-search-card').each((_, el) => {
      const $el = $(el)

      const title = $el
        .find('h3, .base-search-card__title, .sr-only')
        .first()
        .text()
        .trim()
      const company = $el
        .find('h4 a, .base-search-card__subtitle a, .hidden-nested-link')
        .first()
        .text()
        .trim()
      const location = $el
        .find('.job-search-card__location, .base-search-card__metadata span')
        .first()
        .text()
        .trim()
      const postedDate = $el.find('time').text().trim()
      const detailUrl =
        $el.find('.base-card__full-link, a[href*="/jobs/view/"]').first().attr('href') || ''

      // Extract job ID from URL
      const jobIdMatch = detailUrl.match(/\/view\/[^/]*?-?(\d+)/)
      const jobId = jobIdMatch ? jobIdMatch[1] : undefined

      if (title && company) {
        const cleanUrl = detailUrl ? detailUrl.split('?')[0] : ''

        results.push({
          externalId: jobId,
          title,
          company,
          location: location || 'United States',
          postedAtRaw: postedDate || 'Today',
          applyUrl: cleanUrl || (jobId ? `https://www.linkedin.com/jobs/view/${jobId}` : ''),
          sourceUrl: cleanUrl || undefined,
        })
      }
    })

    return results
  }

  protected buildSearchUrl(options: ScrapeOptions): string {
    const params = new URLSearchParams()
    params.set('keywords', options.searchQuery)

    if (options.location) {
      params.set('location', options.location)
    }

    if (options.remote) {
      params.set('f_WT', '2')
    }

    if (options.postedWithin === '24h') {
      params.set('f_TPR', 'r86400')
    } else if (options.postedWithin === '7d') {
      params.set('f_TPR', 'r604800')
    }

    if (options.employmentTypes?.includes('contract')) {
      params.set('f_JT', 'C')
    }

    return `https://www.linkedin.com/jobs/search/?${params.toString()}`
  }

  protected parseJobListing(_html: string, _url: string): Partial<ScrapedJob> | null {
    return null
  }
}
