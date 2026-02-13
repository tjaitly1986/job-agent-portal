import { ScrapedJob, ScrapeOptions, ScrapeResult } from '../mcp/types'
import { normalizePostedDate, isPostedWithin24Hours } from '../utils/date-utils'
import { generateDedupHash } from '../utils/dedup'
import { rateLimiter } from '../utils/rate-limiter'

/**
 * Abstract base class for all job board scrapers
 * Provides common functionality and enforces interface
 */
export abstract class BaseScraper {
  protected platform: string
  protected rateLimitEnabled: boolean = true

  constructor(platform: string) {
    this.platform = platform.toLowerCase()
  }

  /**
   * Main scraping method - must be implemented by each scraper
   */
  abstract scrape(options: ScrapeOptions): Promise<ScrapeResult>

  /**
   * Build search URL for the platform
   */
  protected abstract buildSearchUrl(options: ScrapeOptions): string

  /**
   * Parse a job listing page and extract job data
   */
  protected abstract parseJobListing(html: string, url: string): Partial<ScrapedJob> | null

  /**
   * Wait for rate limit before making request
   */
  protected async waitForRateLimit(): Promise<void> {
    if (this.rateLimitEnabled) {
      await rateLimiter.throttle(this.platform)
    }
  }

  /**
   * Normalize a scraped job to standard format
   */
  protected normalizeJob(job: Partial<ScrapedJob>): ScrapedJob | null {
    // Required fields
    if (!job.title || !job.company || !job.location || !job.applyUrl) {
      console.warn(`[${this.platform}] Missing required fields, skipping job`)
      return null
    }

    // Normalize posted date
    const postedAt = job.postedAtRaw
      ? normalizePostedDate(job.postedAtRaw)
      : new Date().toISOString()

    // Filter out jobs older than 24 hours if that's what we're looking for
    if (!isPostedWithin24Hours(postedAt)) {
      console.log(`[${this.platform}] Job older than 24h, skipping: ${job.title}`)
      return null
    }

    // Parse salary if provided
    const { salaryMin, salaryMax, salaryType } = this.parseSalary(job.salaryText || '')

    // Detect remote
    const isRemote = this.detectRemote(job.title, job.location, job.description)

    // Generate dedup hash
    generateDedupHash(job.title, job.company, job.location)

    return {
      externalId: job.externalId,
      platform: this.platform,
      title: job.title.trim(),
      company: job.company.trim(),
      location: job.location.trim(),
      isRemote,
      salaryText: job.salaryText,
      salaryMin,
      salaryMax,
      salaryType,
      employmentType: job.employmentType,
      description: job.description,
      descriptionHtml: job.descriptionHtml,
      requirements: job.requirements,
      postedAt,
      postedAtRaw: job.postedAtRaw || '',
      applyUrl: job.applyUrl,
      sourceUrl: job.sourceUrl,
    } as ScrapedJob
  }

  /**
   * Parse salary text into min/max/type
   * Handles formats like: "$85-95/hr", "$120,000-$150,000/yr", "$100k-120k"
   */
  protected parseSalary(salaryText: string): {
    salaryMin?: number
    salaryMax?: number
    salaryType?: 'hourly' | 'annual'
  } {
    if (!salaryText) return {}

    const text = salaryText.toLowerCase()

    // Determine type
    const isHourly = /\/hr|per hour|hourly/i.test(text)
    const isAnnual = /\/yr|per year|annually|\/year|k\b/i.test(text)
    const salaryType = isHourly ? 'hourly' : isAnnual ? 'annual' : undefined

    // Extract numbers
    const numbers = text.match(/\d+[,\d]*/g)
    if (!numbers || numbers.length === 0) return { salaryType }

    const cleanNumbers = numbers.map((n) => parseInt(n.replace(/,/g, ''), 10))

    // Handle "100k" format
    if (text.includes('k')) {
      cleanNumbers[0] = cleanNumbers[0] * 1000
      if (cleanNumbers[1]) cleanNumbers[1] = cleanNumbers[1] * 1000
    }

    // Convert annual to hourly for consistent storage (2080 hours/year)
    let salaryMin = cleanNumbers[0]
    let salaryMax = cleanNumbers[1] || cleanNumbers[0]

    if (salaryType === 'annual') {
      salaryMin = Math.round(salaryMin / 2080)
      salaryMax = Math.round(salaryMax / 2080)
    }

    return {
      salaryMin,
      salaryMax,
      salaryType,
    }
  }

  /**
   * Detect if a job is remote based on various signals
   */
  protected detectRemote(title: string, location: string, description?: string): boolean {
    const remoteKeywords = ['remote', 'work from home', 'wfh', 'telecommute', 'anywhere']

    const titleLower = title.toLowerCase()
    const locationLower = location.toLowerCase()
    const descLower = (description || '').toLowerCase()

    return remoteKeywords.some(
      (keyword) =>
        titleLower.includes(keyword) ||
        locationLower.includes(keyword) ||
        descLower.includes(keyword)
    )
  }

  /**
   * Extract job ID from URL if possible
   */
  protected extractJobIdFromUrl(url: string): string | undefined {
    const match = url.match(/(?:jk=|job[_-]?id[_=\-]|\/jobs?\/)([a-zA-Z0-9]+)/i)
    return match ? match[1] : undefined
  }

  /**
   * Log scraping activity
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const prefix = `[${this.platform.toUpperCase()}]`
    if (level === 'error') {
      console.error(prefix, message)
    } else if (level === 'warn') {
      console.warn(prefix, message)
    } else {
      console.log(prefix, message)
    }
  }
}
