import { BaseScraper } from './base-scraper'
import { ScrapedJob, ScrapeOptions, ScrapeResult, RecruiterContact } from '../mcp/types'
import { brightDataClient } from '../mcp/bright-data'
import * as cheerio from 'cheerio'

/**
 * Dice.com job scraper
 * Strategy: Fetch search page, extract __NEXT_DATA__ JSON (Dice uses Next.js)
 * Fallback: Parse HTML with cheerio
 */
export class DiceScraper extends BaseScraper {
  constructor() {
    super('dice')
  }

  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    this.log(`Starting scrape with query: "${options.searchQuery}"`)

    const jobs: ScrapedJob[] = []
    const recruiterContacts: RecruiterContact[] = []
    const errors: string[] = []
    const maxResults = options.maxResults || 30

    try {
      const maxPages = Math.ceil(maxResults / 20)

      for (let page = 1; page <= maxPages; page++) {
        await this.waitForRateLimit()

        const url = this.buildSearchUrl(options, page)
        this.log(`Fetching page ${page}: ${url}`)

        let html: string
        try {
          // Try direct fetch first (saves Bright Data credits)
          html = await this.fetchDirect(url)
        } catch {
          // Fall back to Bright Data proxy
          if (brightDataClient.isConfigured()) {
            this.log('Direct fetch failed, using Bright Data proxy')
            html = await brightDataClient.fetchHtml(url)
          } else {
            throw new Error('Direct fetch failed and Bright Data not configured')
          }
        }

        const pageJobs = this.parseSearchResults(html)
        this.log(`Found ${pageJobs.length} jobs on page ${page}`)

        for (const partialJob of pageJobs) {
          const normalized = this.normalizeJob(partialJob, options.postedWithin)
          if (normalized) {
            jobs.push(normalized)
            // Extract recruiter info if available
            if ((partialJob as DicePartialJob).recruiterName) {
              recruiterContacts.push({
                name: (partialJob as DicePartialJob).recruiterName,
                company: (partialJob as DicePartialJob).recruiterCompany,
                source: 'dice',
              })
            }
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
      recruiterContacts: recruiterContacts.length > 0 ? recruiterContacts : undefined,
      totalFound: jobs.length,
      newJobs: jobs.length,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  private async fetchDirect(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.text()
  }

  private parseSearchResults(html: string): Partial<ScrapedJob>[] {
    const results: Partial<ScrapedJob>[] = []

    // Strategy 1: Extract __NEXT_DATA__ JSON (Dice uses Next.js)
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
    )
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1])
        const searchData =
          nextData?.props?.pageProps?.searchResult?.data ||
          nextData?.props?.pageProps?.searchResults ||
          nextData?.props?.pageProps?.jobs ||
          []

        for (const item of searchData) {
          const title = item.title || item.jobTitle
          const company = item.companyName || item.company?.name
          const location = item.jobLocation?.displayName || item.location || ''
          const jobId = item.id || item.jobId
          const detailUrl = item.detailsPageUrl || item.pageUrl

          if (title && company) {
            results.push({
              externalId: jobId,
              title,
              company,
              location: location || 'United States',
              salaryText: item.salary || item.compensation || undefined,
              employmentType: item.employmentType || item.workType || undefined,
              description: item.summary || item.description || undefined,
              postedAtRaw: item.postedDate || item.dateCreated || 'Today',
              applyUrl: detailUrl
                ? detailUrl.startsWith('http')
                  ? detailUrl
                  : `https://www.dice.com${detailUrl}`
                : `https://www.dice.com/job-detail/${jobId}`,
              sourceUrl: `https://www.dice.com/job-detail/${jobId}`,
              recruiterName: item.recruiter?.name,
              recruiterCompany: item.recruiter?.company,
            } as DicePartialJob)
          }
        }

        if (results.length > 0) return results
      } catch (e) {
        this.log(`Failed to parse __NEXT_DATA__: ${e}`, 'warn')
      }
    }

    // Strategy 2: Cheerio HTML parsing fallback
    const $ = cheerio.load(html)
    $(
      '[data-cy="search-card"], .diceJobcards .card, a[id^="job-"]'
    ).each((_, el) => {
      const $el = $(el)
      const title =
        $el.find('[data-cy="card-title-link"], .card-title-link, h5').text().trim()
      const company =
        $el
          .find(
            '[data-cy="search-result-company-name"], .card-company, [data-testid="company-name"]'
          )
          .text()
          .trim()
      const location =
        $el
          .find(
            '[data-cy="search-result-location"], .card-location, [data-testid="location"]'
          )
          .text()
          .trim()

      if (title && company) {
        const href =
          $el.find('a[data-cy="card-title-link"]').attr('href') ||
          $el.find('a').first().attr('href') ||
          ''

        results.push({
          externalId: $el.attr('data-id') || $el.attr('id') || undefined,
          title,
          company,
          location: location || 'United States',
          salaryText:
            $el
              .find('[data-cy="search-result-salary"], .card-salary')
              .text()
              .trim() || undefined,
          postedAtRaw:
            $el
              .find('[data-cy="card-posted-date"], .card-posted-date, time')
              .text()
              .trim() || 'Today',
          applyUrl: href.startsWith('http')
            ? href
            : href
              ? `https://www.dice.com${href}`
              : '',
        })
      }
    })

    return results
  }

  protected buildSearchUrl(options: ScrapeOptions, page: number = 1): string {
    const params = new URLSearchParams()
    params.set('q', options.searchQuery)
    params.set('page', page.toString())
    params.set('pageSize', '20')
    params.set('countryCode2', 'US')

    if (options.location) {
      params.set('location', options.location)
    }

    if (options.remote) {
      params.set('filters.workplaceTypes', 'Remote')
    }

    if (options.employmentTypes?.includes('c2c') || options.employmentTypes?.includes('contract')) {
      params.set('filters.employmentType', 'CONTRACTS')
    }

    if (options.postedWithin === '24h') {
      params.set('filters.postedDate', 'ONE')
    } else if (options.postedWithin === '3d') {
      params.set('filters.postedDate', 'THREE')
    } else if (options.postedWithin === '7d') {
      params.set('filters.postedDate', 'SEVEN')
    } else if (options.postedWithin === '14d') {
      params.set('filters.postedDate', 'FOURTEEN')
    }

    return `https://www.dice.com/jobs?${params.toString()}`
  }

  protected parseJobListing(_html: string, _url: string): Partial<ScrapedJob> | null {
    return null
  }
}

// Extended type for Dice-specific recruiter fields
interface DicePartialJob extends Partial<ScrapedJob> {
  recruiterName?: string
  recruiterCompany?: string
}
