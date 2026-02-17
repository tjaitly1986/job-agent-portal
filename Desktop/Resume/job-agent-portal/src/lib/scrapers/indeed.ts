import { BaseScraper } from './base-scraper'
import { ScrapedJob, ScrapeOptions, ScrapeResult } from '../mcp/types'
import { brightDataClient } from '../mcp/bright-data'
import * as cheerio from 'cheerio'

/**
 * Indeed.com job scraper
 * Requires Bright Data proxy (Indeed aggressively blocks direct requests)
 * Strategy: Extract embedded mosaic-provider-jobcards JSON, fallback to cheerio
 */
export class IndeedScraper extends BaseScraper {
  constructor() {
    super('indeed')
  }

  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    this.log(`Starting scrape with query: "${options.searchQuery}"`)

    if (!brightDataClient.isConfigured()) {
      this.log('Bright Data not configured - Indeed requires proxy access', 'error')
      return {
        jobs: [],
        totalFound: 0,
        newJobs: 0,
        errors: ['Bright Data not configured - Indeed requires proxy access'],
      }
    }

    const jobs: ScrapedJob[] = []
    const errors: string[] = []
    const maxResults = options.maxResults || 30
    const resultsPerPage = 15

    try {
      const maxPages = Math.ceil(maxResults / resultsPerPage)

      for (let page = 0; page < maxPages; page++) {
        await this.waitForRateLimit()

        const start = page * resultsPerPage
        const url = this.buildSearchUrl(options, start)
        this.log(`Fetching page ${page + 1} (start=${start}): ${url}`)

        const html = await brightDataClient.fetchHtml(url)
        const pageJobs = this.parseSearchResults(html)
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

  protected buildSearchUrl(options: ScrapeOptions, start: number = 0): string {
    const params = new URLSearchParams()
    params.set('q', options.searchQuery)

    if (options.location) {
      params.set('l', options.location)
    }

    if (options.remote) {
      params.set('remotejob', '1')
    }

    if (start > 0) {
      params.set('start', start.toString())
    }

    // Don't let Indeed filter duplicates (we handle dedup ourselves)
    params.set('filter', '0')

    if (options.postedWithin === '24h') {
      params.set('fromage', '1')
    } else if (options.postedWithin === '3d') {
      params.set('fromage', '3')
    } else if (options.postedWithin === '7d') {
      params.set('fromage', '7')
    } else if (options.postedWithin === '14d') {
      params.set('fromage', '14')
    } else if (options.postedWithin === '30d') {
      params.set('fromage', '30')
    }

    return `https://www.indeed.com/jobs?${params.toString()}`
  }

  private parseSearchResults(html: string): Partial<ScrapedJob>[] {
    const results: Partial<ScrapedJob>[] = []

    // Strategy 1: Extract embedded mosaic-provider-jobcards JSON
    const mosaicMatch = html.match(
      /window\.mosaic\.providerData\["mosaic-provider-jobcards"\]\s*=\s*(\{[\s\S]+?\});\s*<\/script>/
    )
    if (mosaicMatch) {
      try {
        const mosaicData = JSON.parse(mosaicMatch[1])
        const jobResults =
          mosaicData?.metaData?.mosaicProviderJobCardsModel?.results || []

        for (const item of jobResults) {
          const jobKey = item.jobkey || item.jk
          if (!jobKey) continue

          const salaryText = item.salarySnippet?.salaryTextFormatted ||
            (item.extractedSalary?.max
              ? `$${item.extractedSalary.min}-$${item.extractedSalary.max}/${item.extractedSalary.type === 'yearly' ? 'yr' : 'hr'}`
              : undefined)

          results.push({
            externalId: jobKey,
            title: item.displayTitle || item.title || item.normTitle,
            company: item.company || item.truncatedCompany,
            location: item.formattedLocation || item.jobLocationCity || 'United States',
            salaryText,
            employmentType: item.jobTypes?.[0] || undefined,
            description: item.snippet || undefined,
            postedAtRaw: item.formattedRelativeTime || item.pubDate || 'Today',
            applyUrl: `https://www.indeed.com/viewjob?jk=${jobKey}`,
            sourceUrl: `https://www.indeed.com/viewjob?jk=${jobKey}`,
          })
        }

        if (results.length > 0) return results
      } catch (e) {
        this.log(`Failed to parse mosaic data: ${e}`, 'warn')
      }
    }

    // Strategy 2: Cheerio DOM parsing fallback
    const $ = cheerio.load(html)
    $('.job_seen_beacon, [data-jk], .resultContent').each((_, el) => {
      const $el = $(el)
      const jobKey =
        $el.attr('data-jk') ||
        $el.closest('[data-jk]').attr('data-jk') ||
        $el.find('a[data-jk]').attr('data-jk')

      const title = $el
        .find('.jobTitle span, [id^="jobTitle"], h2 a span')
        .text()
        .trim()
      const company = $el
        .find('[data-testid="company-name"], .companyName, .company_location .companyName')
        .text()
        .trim()
      const location = $el
        .find('[data-testid="text-location"], .companyLocation, .company_location .companyLocation')
        .text()
        .trim()

      if (title && company) {
        results.push({
          externalId: jobKey || undefined,
          title,
          company,
          location: location || 'United States',
          salaryText:
            $el
              .find(
                '.salary-snippet-container, [data-testid="attribute_snippet_testid"], .metadata .attribute_snippet'
              )
              .text()
              .trim() || undefined,
          description: $el.find('.job-snippet, .underShelfFooter').text().trim() || undefined,
          postedAtRaw:
            $el.find('.date, [data-testid="myJobsStateDate"], .new').text().trim() ||
            'Today',
          applyUrl: jobKey
            ? `https://www.indeed.com/viewjob?jk=${jobKey}`
            : '',
        })
      }
    })

    return results
  }

  protected parseJobListing(_html: string, _url: string): Partial<ScrapedJob> | null {
    return null
  }
}
