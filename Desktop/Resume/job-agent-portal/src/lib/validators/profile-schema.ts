import { z } from 'zod'
import { employmentTypeSchema, platformSchema, salaryTypeSchema } from './job-schema'

// Search profile creation/update schema
export const createProfileSchema = z.object({
  name: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
  jobTitles: z
    .array(z.string().min(1))
    .min(1, 'At least one job title is required')
    .max(10, 'Maximum 10 job titles allowed'),
  skills: z.array(z.string().min(1)).max(50).default([]),
  locations: z.array(z.string().min(1)).max(20).default(['United States']),
  isRemote: z.boolean().default(true),
  employmentTypes: z.array(employmentTypeSchema).default(['contract', 'c2c']),
  minSalary: z.number().int().positive().optional(),
  maxSalary: z.number().int().positive().optional(),
  salaryType: salaryTypeSchema.default('hourly'),
  excludeKeywords: z.array(z.string().min(1)).max(50).default([]),
  includeKeywords: z.array(z.string().min(1)).max(50).default([]),
  platforms: z.array(platformSchema).default([
    'indeed',
    'dice',
    'glassdoor',
    'ziprecruiter',
    'linkedin',
  ]),
  domain: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

export const updateProfileSchema = createProfileSchema.partial().extend({
  lastSearched: z.string().datetime().optional(),
})

// Profile search preferences (for triggering searches)
export const profileSearchRequestSchema = z.object({
  profileIds: z.array(z.string().uuid()).optional(),
  platforms: z.array(platformSchema).optional(),
  force: z.boolean().default(false), // Force search even if recently searched
})

export type CreateProfileInput = z.infer<typeof createProfileSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ProfileSearchRequest = z.infer<typeof profileSearchRequestSchema>
