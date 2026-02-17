import { BaseScraper } from './base-scraper'
import { ScrapedJob, ScrapeOptions, ScrapeResult } from '../mcp/types'
import { brightDataClient } from '../mcp/bright-data'
import * as cheerio from 'cheerio'

/**
 * Built In job scraper
 * Built In focuses on tech/startup jobs in major US cities
 * Strategy: Parse HTML with cheerio — Built In has relatively clean markup
 * Direct fetch usually works; proxy fallback for reliability
 */
export class BuiltInScraper extends BaseScraper {
  constructor() {
    super('builtin')
  }

  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    this.log(`Starting scrape with query: "${options.searchQuery}"`)

    const jobs: ScrapedJob[] = []
    const errors: string[] = []
    const maxResults = options.maxResults || 30

    try {
      const maxPages = Math.ceil(maxResults / 25)

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

    // Strategy 1: JSON-LD structured data
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonLd = JSON.parse($(el).text())
        // Handle both single items and arrays
        const items = Array.isArray(jsonLd) ? jsonLd : jsonLd['@graph'] || [jsonLd]

        for (const item of items) {
          if (item['@type'] === 'JobPosting' && item.title && item.hiringOrganization?.name) {
            const loc = item.jobLocation?.[0] || item.jobLocation
            results.push({
              externalId: item.identifier?.value || undefined,
              title: item.title,
              company: item.hiringOrganization.name,
              location: loc?.address?.addressLocality
                ? `${loc.address.addressLocality}, ${loc.address.addressRegion || ''}`
                : 'United States',
              salaryText: item.baseSalary?.value
                ? `$${item.baseSalary.value.minValue}-$${item.baseSalary.value.maxValue}/${item.baseSalary.value.unitText === 'YEAR' ? 'yr' : 'hr'}`
                : undefined,
              employmentType: item.employmentType?.toLowerCase() || undefined,
              description: item.description?.replace(/<[^>]*>/g, '').slice(0, 500) || undefined,
              postedAtRaw: item.datePosted || 'Today',
              applyUrl: item.url || '',
              sourceUrl: item.url || undefined,
            })
          }
        }
      } catch {
        // Ignore invalid JSON-LD
      }
    })
    if (results.length > 0) return results

    // Strategy 2: Cheerio HTML parsing
    $('[data-id="job-card"], .job-card, article.job-listing, .views-row').each((_, el) => {
      const $el = $(el)

      const title = $el.find('h2 a, .job-title a, .field--name-title a, [data-testid="job-title"]').text().trim()
      const company = $el.find('.company-name, .field--name-field-company a, [data-testid="company-name"]').text().trim()
      const location = $el.find('.job-location, .field--name-field-job-location, [data-testid="location"]').text().trim()
      const salary = $el.find('.job-salary, .field--name-field-salary-range').text().trim()
      const posted = $el.find('.job-date, .field--name-created, time').text().trim()

      if (title && company) {
        const href = $el.find('h2 a, .job-title a, .field--name-title a').first().attr('href') || ''

        results.push({
          externalId: $el.attr('data-id') || $el.attr('data-nid') || undefined,
          title,
          company,
          location: location || 'United States',
          salaryText: salary || undefined,
          postedAtRaw: posted || 'Today',
          applyUrl: href.startsWith('http')
            ? href
            : href
              ? `https://builtin.com${href}`
              : '',
          sourceUrl: href.startsWith('http')
            ? href
            : href
              ? `https://builtin.com${href}`
              : undefined,
        })
      }
    })

    return results
  }

  protected buildSearchUrl(options: ScrapeOptions, page: number = 1): string {
    const query = encodeURIComponent(options.searchQuery)
    const params: string[] = []

    if (page > 1) {
      params.push(`page=${page}`)
    }

    if (options.remote) {
      params.push('allRemote=true')
    }

    if (options.postedWithin === '24h') {
      params.push('daysSinceUpdated=1')
    } else if (options.postedWithin === '3d') {
      params.push('daysSinceUpdated=3')
    } else if (options.postedWithin === '7d') {
      params.push('daysSinceUpdated=7')
    } else if (options.postedWithin === '14d') {
      params.push('daysSinceUpdated=14')
    }

    const paramStr = params.length > 0 ? `&${params.join('&')}` : ''
    return `https://builtin.com/jobs/search?search=${query}${paramStr}`
  }

  protected parseJobListing(_html: string, _url: string): Partial<ScrapedJob> | null {
    return null
  }
}
