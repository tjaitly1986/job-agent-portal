/**
 * Normalize posting date strings from various job boards to ISO 8601 UTC
 *
 * Handles formats like:
 * - "Just posted", "Today", "Posted today"
 * - "2 hours ago", "5 minutes ago"
 * - "1 day ago", "3 days ago"
 * - "2d", "5h" (Glassdoor format)
 * - ISO timestamps
 */
export function normalizePostedDate(rawDate: string): string {
  const now = new Date()
  const lowerDate = rawDate.toLowerCase().trim()

  // Just posted / Today
  if (
    lowerDate.includes('just posted') ||
    lowerDate === 'today' ||
    lowerDate.includes('posted today')
  ) {
    return now.toISOString()
  }

  // X minutes ago
  const minutesMatch = lowerDate.match(/(\d+)\s*(?:minute|min)s?\s*ago/)
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1], 10)
    const date = new Date(now.getTime() - minutes * 60 * 1000)
    return date.toISOString()
  }

  // X hours ago / Xh
  const hoursMatch = lowerDate.match(/(\d+)\s*(?:hour|hr|h)s?\s*(?:ago)?/)
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10)
    const date = new Date(now.getTime() - hours * 60 * 60 * 1000)
    return date.toISOString()
  }

  // X days ago / Xd
  const daysMatch = lowerDate.match(/(\d+)\s*(?:day|d)s?\s*(?:ago)?/)
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10)
    const date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    return date.toISOString()
  }

  // X weeks ago
  const weeksMatch = lowerDate.match(/(\d+)\s*(?:week|wk)s?\s*ago/)
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1], 10)
    const date = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000)
    return date.toISOString()
  }

  // X months ago
  const monthsMatch = lowerDate.match(/(\d+)\s*(?:month|mo)s?\s*ago/)
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1], 10)
    const date = new Date(now)
    date.setMonth(date.getMonth() - months)
    return date.toISOString()
  }

  // Try parsing as ISO date
  try {
    const date = new Date(rawDate)
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }
  } catch {
    // Fall through to default
  }

  // Default to now if we can't parse
  return now.toISOString()
}

/**
 * Check if a job was posted within the last 24 hours
 */
export function isPostedWithin24Hours(postedAt: string): boolean {
  const postedDate = new Date(postedAt)
  const now = new Date()
  const hoursDiff = (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60)
  return hoursDiff <= 24
}

/**
 * Format a date as "X hours ago" or "X days ago"
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  } else if (diffDays < 30) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
  } else {
    const diffMonths = Math.floor(diffDays / 30)
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`
  }
}
