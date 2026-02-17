import { BaseScraper } from './base-scraper'
import { ScrapedJob, ScrapeOptions, ScrapeResult } from '../mcp/types'
import * as cheerio from 'cheerio'

/**
 * We Work Remotely job scraper
 * WWR is a remote-only job board with clean, static HTML — easiest to scrape
 * Strategy: Direct fetch + cheerio (no proxy needed, no anti-bot protection)
 * All jobs are remote by default
 */
export class WeWorkRemotelyScraper extends BaseScraper {
  constructor() {
    super('weworkremotely')
  }

  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    this.log(`Starting scrape with query: "${options.searchQuery}"`)

    const jobs: ScrapedJob[] = []
    const errors: string[] = []
    const maxResults = options.maxResults || 30

    try {
      await this.waitForRateLimit()

      const url = this.buildSearchUrl(options)
      this.log(`Fetching: ${url}`)

      const html = await this.fetchDirect(url)
      const pageJobs = this.parseSearchResults(html)
      this.log(`Found ${pageJobs.length} jobs`)

      for (const partialJob of pageJobs) {
        // Force all WWR jobs to be remote
        partialJob.isRemote = true
        const normalized = this.normalizeJob(partialJob, options.postedWithin)
        if (normalized) {
          jobs.push(normalized)
        }
      }

      // Also try category pages for broader results
      if (jobs.length < maxResults) {
        const categoryJobs = await this.scrapeCategories(options, maxResults - jobs.length)
        jobs.push(...categoryJobs)
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

  /**
   * Scrape relevant category pages for additional results
   */
  private async scrapeCategories(options: ScrapeOptions, maxAdditional: number): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []
    const query = options.searchQuery.toLowerCase()

    // Map search terms to WWR categories
    const categories = this.matchCategories(query)

    for (const category of categories) {
      if (jobs.length >= maxAdditional) break

      try {
        await this.waitForRateLimit()
        const url = `https://weworkremotely.com/categories/remote-${category}-jobs`
        this.log(`Fetching category: ${url}`)

        const html = await this.fetchDirect(url)
        const pageJobs = this.parseSearchResults(html)

        // Filter by search query relevance
        for (const partialJob of pageJobs) {
          const titleLower = (partialJob.title || '').toLowerCase()
          const descLower = (partialJob.description || '').toLowerCase()

          // Basic relevance check: title or description contains search terms
          const searchTerms = query.split(/\s+/)
          const isRelevant = searchTerms.some(
            (term) => titleLower.includes(term) || descLower.includes(term)
          )

          if (isRelevant) {
            partialJob.isRemote = true
            const normalized = this.normalizeJob(partialJob, options.postedWithin)
            if (normalized) {
              jobs.push(normalized)
            }
          }
        }
      } catch (e) {
        this.log(`Category ${category} fetch failed: ${e}`, 'warn')
      }
    }

    return jobs
  }

  private matchCategories(query: string): string[] {
    const categories: string[] = []
    const categoryMap: Record<string, string[]> = {
      'programming': ['software', 'developer', 'engineer', 'programming', 'backend', 'frontend', 'fullstack', 'full-stack', 'python', 'java', 'react', 'node'],
      'devops-sysadmin': ['devops', 'sysadmin', 'infrastructure', 'cloud', 'aws', 'platform', 'site reliability'],
      'product': ['product manager', 'product owner', 'product lead'],
      'design': ['designer', 'ux', 'ui', 'graphic', 'design'],
      'data': ['data', 'analytics', 'machine learning', 'ai', 'artificial intelligence', 'ml', 'data engineer', 'data scientist'],
      'management-finance': ['manager', 'finance', 'business', 'strategy', 'analyst', 'operations'],
      'customer-support': ['customer', 'support', 'success'],
      'sales-marketing': ['sales', 'marketing', 'growth', 'seo'],
    }

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some((kw) => query.includes(kw))) {
        categories.push(category)
      }
    }

    // Default to programming if no match
    if (categories.length === 0) {
      categories.push('programming')
    }

    return categories.slice(0, 2)
  }

  private parseSearchResults(html: string): Partial<ScrapedJob>[] {
    const results: Partial<ScrapedJob>[] = []
    const $ = cheerio.load(html)

    // WWR uses a simple list structure
    $('li.feature, li.listing-item, section.jobs article li').each((_, el) => {
      const $el = $(el)

      // Skip "view all" links and empty items
      if ($el.hasClass('view-all') || $el.find('a').length === 0) return

      const $link = $el.find('a[href*="/remote-jobs/"]').first()
      if ($link.length === 0) return

      const href = $link.attr('href') || ''

      const title = $el.find('.title, h3, [class*="title"]').text().trim() ||
        $link.find('span.title').text().trim() ||
        $link.text().trim()
      const company = $el.find('.company, span.company, [class*="company"]').text().trim()
      const location = $el.find('.region, span.region, [class*="region"]').text().trim()
      const posted = $el.find('time, .date, [class*="date"]').text().trim()

      if (title && company) {
        results.push({
          title,
          company,
          location: location || 'Remote',
          isRemote: true,
          postedAtRaw: posted || 'Today',
          applyUrl: href.startsWith('http')
            ? href
            : `https://weworkremotely.com${href}`,
          sourceUrl: href.startsWith('http')
            ? href
            : `https://weworkremotely.com${href}`,
        })
      }
    })

    // Also try the RSS-style listing format
    if (results.length === 0) {
      $('article.job, .job-listing, [data-job-id]').each((_, el) => {
        const $el = $(el)
        const title = $el.find('h2, h3, .job-title').text().trim()
        const company = $el.find('.company-name, .employer').text().trim()

        if (title && company) {
          const href = $el.find('a').first().attr('href') || ''
          results.push({
            title,
            company,
            location: 'Remote',
            isRemote: true,
            postedAtRaw: $el.find('time').attr('datetime') || 'Today',
            applyUrl: href.startsWith('http')
              ? href
              : `https://weworkremotely.com${href}`,
          })
        }
      })
    }

    return results
  }

  protected buildSearchUrl(options: ScrapeOptions): string {
    const query = encodeURIComponent(options.searchQuery)
    return `https://weworkremotely.com/remote-jobs/search?utf8=%E2%9C%93&term=${query}`
  }

  protected parseJobListing(_html: string, _url: string): Partial<ScrapedJob> | null {
    return null
  }
}
