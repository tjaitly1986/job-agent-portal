/**
 * Profile-related TypeScript interfaces
 */

import { Platform, EmploymentType, SalaryType } from './job'

export interface SearchProfile {
  id: string
  userId: string
  name: string
  isActive: boolean
  jobTitles: string[]
  skills: string[]
  locations: string[]
  isRemote: boolean
  employmentTypes: EmploymentType[]
  minSalary: number | null
  maxSalary: number | null
  salaryType: SalaryType
  excludeKeywords: string[]
  includeKeywords: string[]
  platforms: Platform[]
  domain: string | null
  notes: string | null
  lastSearched: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateProfileInput {
  name: string
  isActive?: boolean
  jobTitles: string[]
  skills?: string[]
  locations?: string[]
  isRemote?: boolean
  employmentTypes?: EmploymentType[]
  minSalary?: number
  maxSalary?: number
  salaryType?: SalaryType
  excludeKeywords?: string[]
  includeKeywords?: string[]
  platforms?: Platform[]
  domain?: string
  notes?: string
}

export interface UpdateProfileInput extends Partial<CreateProfileInput> {
  lastSearched?: string
}
