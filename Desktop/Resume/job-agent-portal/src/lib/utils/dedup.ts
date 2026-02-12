import crypto from 'crypto'

/**
 * Normalize a string for deduplication:
 * - Convert to lowercase
 * - Remove extra whitespace
 * - Remove special characters
 * - Trim
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
}

/**
 * Generate a deduplication hash for a job listing
 * Based on: normalized title + company + location
 *
 * This prevents the same job from appearing multiple times
 * when scraped from different platforms
 */
export function generateDedupHash(title: string, company: string, location: string): string {
  const normalizedTitle = normalizeString(title)
  const normalizedCompany = normalizeString(company)
  const normalizedLocation = normalizeString(location)

  const combined = `${normalizedTitle}-${normalizedCompany}-${normalizedLocation}`

  return crypto.createHash('sha256').update(combined).digest('hex')
}

/**
 * Check if two job listings are likely duplicates
 * Uses fuzzy matching for title similarity
 */
export function areSimilarJobs(
  job1: { title: string; company: string; location: string },
  job2: { title: string; company: string; location: string }
): boolean {
  // Exact match on company and location
  if (
    normalizeString(job1.company) !== normalizeString(job2.company) ||
    normalizeString(job1.location) !== normalizeString(job2.location)
  ) {
    return false
  }

  // Check title similarity (simple approach)
  const title1 = normalizeString(job1.title)
  const title2 = normalizeString(job2.title)

  // If titles are identical, it's a duplicate
  if (title1 === title2) {
    return true
  }

  // Check if one title contains the other (partial match)
  if (title1.includes(title2) || title2.includes(title1)) {
    return true
  }

  return false
}
