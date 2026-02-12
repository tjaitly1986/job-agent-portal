/**
 * MCP (Model Context Protocol) type definitions for job scraping
 */

export interface ScrapedJob {
  externalId?: string
  platform: string
  title: string
  company: string
  location: string
  isRemote: boolean
  salaryText?: string
  salaryMin?: number
  salaryMax?: number
  salaryType?: 'hourly' | 'annual'
  employmentType?: string
  description?: string
  descriptionHtml?: string
  requirements?: string
  postedAt: string // ISO 8601
  postedAtRaw: string // Original text
  applyUrl: string
  sourceUrl?: string
}

export interface RecruiterContact {
  name?: string
  email?: string
  phone?: string
  linkedinUrl?: string
  company?: string
  title?: string
  source: string
}

export interface ScrapeResult {
  jobs: ScrapedJob[]
  recruiterContacts?: RecruiterContact[]
  errors?: string[]
  totalFound: number
  newJobs: number
}

export interface ScrapeOptions {
  searchQuery: string
  location?: string
  maxResults?: number
  postedWithin?: '24h' | '3d' | '7d' | '14d' | '30d'
  remote?: boolean
  employmentTypes?: string[]
}
