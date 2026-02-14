import { z } from 'zod'

export const outreachToneSchema = z.enum(['professional', 'enthusiastic', 'conversational'])

export const createOutreachRecordSchema = z.object({
  jobDescription: z.string().min(1, 'Job description is required'),
  jobTitle: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  recruiterName: z.string().max(200).optional(),
  prerequisites: z.string().max(5000).optional(),
  tone: outreachToneSchema.default('professional'),
  linkedinMessage: z.string().optional(),
  emailMessage: z.string().optional(),
  resumeUrl: z.string().optional(),
  coverLetterUrl: z.string().optional(),
})

export const updateOutreachRecordSchema = z.object({
  linkedinMessage: z.string().optional(),
  emailMessage: z.string().optional(),
  resumeUrl: z.string().optional(),
  coverLetterUrl: z.string().optional(),
})
