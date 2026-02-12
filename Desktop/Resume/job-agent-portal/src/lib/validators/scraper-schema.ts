import { z } from 'zod'
import { platformSchema, employmentTypeSchema } from './job-schema'

// Scrape trigger request
export const triggerScrapeSchema = z.object({
  searchQuery: z.string().min(1).max(200),
  location: z.string().max(100).optional(),
  maxResults: z.number().int().positive().max(500).default(100),
  postedWithin: z.enum(['24h', '3d', '7d', '14d', '30d']).default('24h'),
  remote: z.boolean().default(true),
  employmentTypes: z.array(employmentTypeSchema).default(['contract', 'c2c']),
  platforms: z
    .array(platformSchema)
    .min(1)
    .default(['indeed', 'dice', 'linkedin']),
})

export type TriggerScrapeInput = z.infer<typeof triggerScrapeSchema>
