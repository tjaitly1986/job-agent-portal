/**
 * Job-related TypeScript interfaces
 */

export type Platform = 'indeed' | 'dice' | 'glassdoor' | 'ziprecruiter' | 'linkedin'

export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'c2c' | 'temporary' | 'contract-to-hire'

export type SalaryType = 'hourly' | 'annual'

export interface Job {
  id: string
  externalId: string | null
  platform: Platform
  title: string
  company: string
  location: string
  isRemote: boolean
  salaryMin: number | null
  salaryMax: number | null
  salaryType: SalaryType | null
  employmentType: EmploymentType | null
  description: string | null
  descriptionHtml: string | null
  requirements: string | null
  postedAt: string
  postedAtRaw: string | null
  applyUrl: string
  sourceUrl: string | null
  dedupHash: string | null
  isFeatured: boolean
  // AI matching fields
  matchScore: number | null
  matchReasons: string[] | null
  createdAt: string
  updatedAt: string
}

export interface JobFilterParams {
  platform?: Platform
  isRemote?: boolean
  employmentType?: EmploymentType
  company?: string
  location?: string
  search?: string
  minSalary?: number
  maxSalary?: number
  postedAfter?: string
  postedBefore?: string
  limit?: number
  offset?: number
  orderBy?: 'posted_at' | 'created_at' | 'salary_max'
  orderDir?: 'asc' | 'desc'
}
