import { z } from 'zod'

// Platform enum
export const platformSchema = z.enum([
  'indeed',
  'dice',
  'glassdoor',
  'ziprecruiter',
  'linkedin',
  'simplyhired',
  'builtin',
  'weworkremotely',
  'other',
])

// Employment type
export const employmentTypeSchema = z.enum([
  'contract',
  'c2c',
  'full-time',
  'part-time',
  'contract-to-hire',
  'temporary',
  'internship',
])

// Salary type
export const salaryTypeSchema = z.enum(['hourly', 'annual'])

// Job creation schema (from scraping)
export const createJobSchema = z.object({
  externalId: z.string().optional(),
  platform: platformSchema,
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().min(1),
  isRemote: z.boolean().default(false),
  salaryText: z.string().optional(),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
  salaryType: salaryTypeSchema.optional(),
  employmentType: employmentTypeSchema.optional(),
  description: z.string().optional(),
  descriptionHtml: z.string().optional(),
  requirements: z.string().optional(),
  postedAt: z.string().datetime(), // ISO 8601
  postedAtRaw: z.string().optional(),
  applyUrl: z.string().url(),
  sourceUrl: z.string().url().optional(),
})

// Job filter schema (for API queries)
export const jobFilterSchema = z.object({
  platform: platformSchema.optional(),
  isRemote: z.boolean().optional(),
  minSalary: z.number().positive().optional(),
  maxSalary: z.number().positive().optional(),
  employmentType: employmentTypeSchema.optional(),
  postedAfter: z.string().datetime().optional(), // ISO 8601
  postedBefore: z.string().datetime().optional(),
  search: z.string().optional(), // Full-text search
  company: z.string().optional(),
  location: z.string().optional(),
  profileId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  orderBy: z.enum(['posted_at', 'salary_max', 'created_at']).default('posted_at'),
  orderDir: z.enum(['asc', 'desc']).default('desc'),
})

// Job update schema
export const updateJobSchema = z.object({
  isExpired: z.boolean().optional(),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
  description: z.string().optional(),
})

// Recruiter contact schema
export const createRecruiterContactSchema = z.object({
  jobId: z.string().uuid(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  source: z.string().optional(),
})

export type Platform = z.infer<typeof platformSchema>
export type EmploymentType = z.infer<typeof employmentTypeSchema>
export type SalaryType = z.infer<typeof salaryTypeSchema>
export type CreateJobInput = z.infer<typeof createJobSchema>
export type JobFilter = z.infer<typeof jobFilterSchema>
export type UpdateJobInput = z.infer<typeof updateJobSchema>
export type CreateRecruiterContactInput = z.infer<typeof createRecruiterContactSchema>
