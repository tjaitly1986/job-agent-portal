import { z } from 'zod'

// Application status enum
export const applicationStatusSchema = z.enum([
  'saved',
  'ready_to_apply',
  'applied',
  'phone_screen',
  'interview',
  'technical',
  'offer',
  'rejected',
  'withdrawn',
  'expired',
])

// Application source
export const applicationSourceSchema = z.enum([
  'website',
  'email',
  'linkedin',
  'referral',
  'recruiter',
  'other',
])

// Create application
export const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  profileId: z.string().uuid().optional(),
  status: applicationStatusSchema.default('saved'),
  notes: z.string().max(5000).optional(),
})

// Update application
export const updateApplicationSchema = z.object({
  status: applicationStatusSchema.optional(),
  appliedAt: z.string().datetime().optional(),
  appliedVia: applicationSourceSchema.optional(),
  resumeId: z.string().uuid().optional(),
  coverLetterId: z.string().uuid().optional(),
  followUpDate: z.string().date().optional(), // YYYY-MM-DD
  notes: z.string().max(5000).optional(),
  interviewDates: z.array(z.string().datetime()).optional(),
  offerDetails: z
    .object({
      salary: z.number().positive().optional(),
      salaryType: z.enum(['hourly', 'annual']).optional(),
      startDate: z.string().date().optional(),
      benefits: z.string().optional(),
      equity: z.string().optional(),
      bonus: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  rejectionReason: z.string().max(1000).optional(),
})

// Application filter
export const applicationFilterSchema = z.object({
  status: applicationStatusSchema.optional(),
  profileId: z.string().uuid().optional(),
  followUpBefore: z.string().date().optional(),
  followUpAfter: z.string().date().optional(),
  appliedAfter: z.string().datetime().optional(),
  appliedBefore: z.string().datetime().optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  orderBy: z.enum(['created_at', 'updated_at', 'applied_at', 'follow_up_date']).default('updated_at'),
  orderDir: z.enum(['asc', 'desc']).default('desc'),
})

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>
export type ApplicationSource = z.infer<typeof applicationSourceSchema>
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>
export type ApplicationFilter = z.infer<typeof applicationFilterSchema>
