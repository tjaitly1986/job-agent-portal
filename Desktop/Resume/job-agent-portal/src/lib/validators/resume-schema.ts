import { z } from 'zod'

// Resume file type
export const resumeFileTypeSchema = z.enum([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

// Update resume
export const updateResumeSchema = z.object({
  label: z.string().max(100).optional(),
  isDefault: z.boolean().optional(),
})

export type ResumeFileType = z.infer<typeof resumeFileTypeSchema>
export type UpdateResumeInput = z.infer<typeof updateResumeSchema>
