import { BaseScraper } from './base-scraper'
import { ScrapedJob, ScrapeOptions, ScrapeResult } from '../mcp/types'
import { brightDataClient } from '../mcp/bright-data'
import * as cheerio from 'cheerio'

/**
 * Glassdoor job scraper
 * Glassdoor uses React/JS rendering heavily — requires Bright Data proxy
 * Strategy: Extract embedded JSON from __NEXT_DATA__ or Apollo state, fallback to cheerio
 */
export class GlassdoorScraper extends BaseScraper {
  constructor() {
    super('glassdoor')
  }

  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    this.log(`Starting scrape with query: "${options.searchQuery}"`)

    if (!brightDataClient.isConfigured()) {
      this.log('Bright Data not configured - Glassdoor requires proxy access', 'error')
      return {
        jobs: [],
        totalFound: 0,
        newJobs: 0,
        errors: ['Bright Data not configured - Glassdoor requires proxy access'],
      }
    }

    const jobs: ScrapedJob[] = []
    const errors: string[] = []
    const maxResults = options.maxResults || 30

    try {
      const maxPages = Math.ceil(maxResults / 30)

      for (let page = 1; page <= maxPages; page++) {
        await this.waitForRateLimit()

        const url = this.buildSearchUrl(options, page)
        this.log(`Fetching page ${page}: ${url}`)

        const html = await brightDataClient.fetchHtml(url)
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

  private parseSearchResults(html: string): Partial<ScrapedJob>[] {
    const results: Partial<ScrapedJob>[] = []

    // Strategy 1: Extract Apollo/Next embedded JSON
    const apolloMatch = html.match(
      /window\.__apolloState__\s*=\s*(\{[\s\S]+?\});\s*<\/script>/
    )
    if (apolloMatch) {
      try {
        const apolloData = JSON.parse(apolloMatch[1])
        for (const key of Object.keys(apolloData)) {
          if (key.startsWith('JobListingSearchResult:') || key.startsWith('JobListing:')) {
            const item = apolloData[key]
            if (item?.jobTitle && item?.employer?.shortName) {
              results.push({
                externalId: item.listingId || item.jobListingId || undefined,
                title: item.jobTitle,
                company: item.employer?.shortName || item.employer?.name,
                location: item.locationName || item.location || 'United States',
                salaryText: item.salarySnippet || item.payPercentile90 ? `$${item.payPercentile10}-$${item.payPercentile90}` : undefined,
                description: item.descriptionFragment || item.jobDescription || undefined,
                postedAtRaw: item.ageInDays !== undefined ? `${item.ageInDays}d ago` : item.discoveredDate || 'Today',
                applyUrl: item.jobViewUrl
                  ? item.jobViewUrl.startsWith('http')
                    ? item.jobViewUrl
                    : `https://www.glassdoor.com${item.jobViewUrl}`
                  : `https://www.glassdoor.com/job-listing/${item.listingId}`,
                sourceUrl: `https://www.glassdoor.com/job-listing/${item.listingId}`,
              })
            }
          }
        }
        if (results.length > 0) return results
      } catch (e) {
        this.log(`Failed to parse Apollo state: ${e}`, 'warn')
      }
    }

    // Strategy 2: __NEXT_DATA__ JSON
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
    )
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1])
        const jobListings =
          nextData?.props?.pageProps?.jobListings ||
          nextData?.props?.pageProps?.searchResults?.jobListings ||
          []

        for (const item of jobListings) {
          const listing = item.jobview || item
          const header = listing.header || listing
          if (header?.jobTitle && header?.employerName) {
            results.push({
              externalId: header.jobLink?.split('?')[0]?.split('/').pop() || undefined,
              title: header.jobTitle,
              company: header.employerName,
              location: header.locationName || 'United States',
              salaryText: header.payPeriod ? `${header.payPeriodAdjustedPay?.p10}-${header.payPeriodAdjustedPay?.p90}` : undefined,
              description: listing.overview?.description || listing.job?.description || undefined,
              postedAtRaw: header.ageInDays !== undefined ? `${header.ageInDays}d ago` : 'Today',
              applyUrl: header.jobLink
                ? header.jobLink.startsWith('http')
                  ? header.jobLink
                  : `https://www.glassdoor.com${header.jobLink}`
                : '',
            })
          }
        }
        if (results.length > 0) return results
      } catch (e) {
        this.log(`Failed to parse __NEXT_DATA__: ${e}`, 'warn')
      }
    }

    // Strategy 3: Cheerio HTML parsing fallback
    const $ = cheerio.load(html)
    $('[data-test="jobListing"], .JobCard_jobCardContainer__arpon, .react-job-listing').each((_, el) => {
      const $el = $(el)
      const title = $el.find('[data-test="job-title"], .JobCard_jobTitle__GLyJ1, .jobTitle').text().trim()
      const company = $el.find('[data-test="emp-name"], .EmployerProfile_compactEmployerName__LE242, .jobEmpolyerName').text().trim()
      const location = $el.find('[data-test="emp-location"], .JobCard_location__rCz3x, .loc').text().trim()
      const salary = $el.find('[data-test="detailSalary"], .JobCard_salaryEstimate__arV5J').text().trim()
      const age = $el.find('[data-test="job-age"], .JobCard_listingAge__KuaxZ').text().trim()

      if (title && company) {
        const href = $el.find('a[data-test="job-title"]').attr('href') ||
          $el.find('a').first().attr('href') || ''

        results.push({
          externalId: $el.attr('data-id') || $el.attr('data-job-id') || undefined,
          title,
          company,
          location: location || 'United States',
          salaryText: salary || undefined,
          postedAtRaw: age || 'Today',
          applyUrl: href.startsWith('http')
            ? href
            : href
              ? `https://www.glassdoor.com${href}`
              : '',
        })
      }
    })

    return results
  }

  protected buildSearchUrl(options: ScrapeOptions, page: number = 1): string {
    const query = encodeURIComponent(options.searchQuery)
    const params = new URLSearchParams()

    if (options.location) {
      params.set('locT', 'C')
      params.set('locKeyword', options.location)
    }

    if (options.remote) {
      params.set('remoteWorkType', '1')
    }

    if (options.postedWithin === '24h') {
      params.set('fromAge', '1')
    } else if (options.postedWithin === '3d') {
      params.set('fromAge', '3')
    } else if (options.postedWithin === '7d') {
      params.set('fromAge', '7')
    } else if (options.postedWithin === '14d') {
      params.set('fromAge', '14')
    }

    const pageParam = page > 1 ? `_IP${page}` : ''
    return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${query}${pageParam}&${params.toString()}`
  }

  protected parseJobListing(_html: string, _url: string): Partial<ScrapedJob> | null {
    return null
  }
}
