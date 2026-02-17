import { BaseScraper } from './base-scraper'
import { ScrapedJob, ScrapeOptions, ScrapeResult } from '../mcp/types'
import { brightDataClient } from '../mcp/bright-data'
import * as cheerio from 'cheerio'

/**
 * SimplyHired job scraper
 * SimplyHired is a job aggregator similar to Indeed (owned by the same parent)
 * Strategy: Parse HTML with cheerio (SimplyHired's HTML is relatively straightforward)
 * Uses Bright Data proxy for reliability
 */
export class SimplyHiredScraper extends BaseScraper {
  constructor() {
    super('simplyhired')
  }

  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    this.log(`Starting scrape with query: "${options.searchQuery}"`)

    const jobs: ScrapedJob[] = []
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
          html = await this.fetchDirect(url)
        } catch {
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
    const $ = cheerio.load(html)

    // Strategy 1: Extract embedded JSON if available
    const jsonMatch = html.match(
      /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\});\s*<\/script>/
    )
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1])
        const jobList = data?.jobs?.results || data?.search?.results || []
        for (const item of jobList) {
          if (item.title && item.company) {
            results.push({
              externalId: item.pjid || item.jobKey || undefined,
              title: item.title,
              company: item.company,
              location: item.location || item.formattedLocation || 'United States',
              salaryText: item.salary || item.estimatedSalary || undefined,
              description: item.snippet || undefined,
              postedAtRaw: item.postedDate || item.dateRecency || 'Today',
              applyUrl: item.url
                ? item.url.startsWith('http')
                  ? item.url
                  : `https://www.simplyhired.com${item.url}`
                : '',
            })
          }
        }
        if (results.length > 0) return results
      } catch (e) {
        this.log(`Failed to parse embedded JSON: ${e}`, 'warn')
      }
    }

    // Strategy 2: Cheerio HTML parsing
    $('[data-testid="searchSerpJob"], .SerpJob-jobCard, article[data-id], li[data-jobkey]').each((_, el) => {
      const $el = $(el)

      const title = $el.find('[data-testid="searchSerpJobTitle"], .SerpJob-link, h2 a, .jobTitle').text().trim()
      const company = $el.find('[data-testid="companyName"], .SerpJob-companyName, .jobposting-company, span.company').text().trim()
      const location = $el.find('[data-testid="searchSerpJobLocation"], .SerpJob-location, .location, span.loc').text().trim()
      const salary = $el.find('[data-testid="searchSerpJobSalary"], .SerpJob-salary, .salary-range').text().trim()
      const posted = $el.find('[data-testid="searchSerpJobDateStamp"], .SerpJob-timestamp, .posted-date').text().trim()

      if (title && company) {
        const href = $el.find('a[data-testid="searchSerpJobTitle"]').attr('href') ||
          $el.find('h2 a, a.SerpJob-link, a.jobTitle').first().attr('href') || ''

        results.push({
          externalId: $el.attr('data-id') || $el.attr('data-jobkey') || undefined,
          title,
          company,
          location: location || 'United States',
          salaryText: salary || undefined,
          postedAtRaw: posted || 'Today',
          applyUrl: href.startsWith('http')
            ? href
            : href
              ? `https://www.simplyhired.com${href}`
              : '',
        })
      }
    })

    return results
  }

  protected buildSearchUrl(options: ScrapeOptions, page: number = 1): string {
    const params = new URLSearchParams()
    params.set('q', options.searchQuery)

    if (options.location) {
      params.set('l', options.location)
    }

    if (page > 1) {
      params.set('pn', page.toString())
    }

    if (options.remote) {
      params.set('fjt', 'remote')
    }

    if (options.postedWithin === '24h') {
      params.set('fdb', '1')
    } else if (options.postedWithin === '3d') {
      params.set('fdb', '3')
    } else if (options.postedWithin === '7d') {
      params.set('fdb', '7')
    } else if (options.postedWithin === '14d') {
      params.set('fdb', '14')
    }

    return `https://www.simplyhired.com/search?${params.toString()}`
  }

  protected parseJobListing(_html: string, _url: string): Partial<ScrapedJob> | null {
    return null
  }
}
