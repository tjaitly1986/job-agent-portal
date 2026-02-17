/**
 * Keyword Matcher — LinkedIn-style strict keyword matching
 *
 * Jobs are only returned if their title matches keywords from the user's
 * search profiles. Each profile job title is split into significant words,
 * and ALL words must appear in the job title as whole words (word-boundary
 * matching) for it to be considered a match.
 *
 * AND within a single title, OR across titles.
 */

// Words to strip from profile titles before matching
const SENIORITY_WORDS = new Set([
  'senior', 'sr', 'sr.', 'junior', 'jr', 'jr.', 'lead', 'principal',
  'staff', 'associate', 'entry', 'mid', 'intern', 'level',
  'i', 'ii', 'iii', 'iv', 'v',
])

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'for', 'in', 'at', 'to', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'on', 'by', 'from', 'into',
  'through', 'no', 'not', 'but', 'also', 'very', 'too', 'so',
])

export interface KeywordGroup {
  /** Significant words extracted from a single profile job title */
  words: string[]
  /** Original title for display */
  originalTitle: string
  /** Which profile this came from */
  profileName: string
}

/**
 * Extract significant words from a job title string.
 * Removes seniority modifiers and stopwords.
 */
export function extractSignificantWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\/\.]/g, ' ')
    .split(/[\s\-\/]+/)
    .filter(w => w.length >= 2)
    .filter(w => !SENIORITY_WORDS.has(w))
    .filter(w => !STOPWORDS.has(w))
}

/**
 * Build keyword groups from profiles.
 * Only uses jobTitles (not includeKeywords — those are employment qualifiers
 * like "W2"/"C2C", not role keywords).
 */
export function buildKeywordGroups(
  profiles: { name: string; jobTitles: string[] }[]
): KeywordGroup[] {
  const groups: KeywordGroup[] = []

  for (const profile of profiles) {
    for (const title of profile.jobTitles) {
      const words = extractSignificantWords(title)
      if (words.length > 0) {
        groups.push({
          words,
          originalTitle: title,
          profileName: profile.name,
        })
      }
    }
  }

  return groups
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Check if a word appears as a whole word in text (word-boundary matching).
 * Prevents "edi" from matching inside "Medicaid" or "ai" inside "Medicaid".
 */
function containsWholeWord(text: string, word: string): boolean {
  const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i')
  return regex.test(text)
}

/**
 * Check if a job title matches a keyword group.
 * ALL words in the group must appear as whole words in the job title.
 */
export function matchesKeywordGroup(
  jobTitle: string,
  group: KeywordGroup
): boolean {
  return group.words.every(word => containsWholeWord(jobTitle, word))
}

/**
 * Find all matching keyword groups for a job title.
 * Returns the groups that match, sorted by best (most specific) match first.
 */
export function findMatchingGroups(
  jobTitle: string,
  groups: KeywordGroup[]
): KeywordGroup[] {
  return groups
    .filter(group => matchesKeywordGroup(jobTitle, group))
    .sort((a, b) => b.words.length - a.words.length)
}

/**
 * Check if a job should be excluded based on exclude keywords from profiles.
 */
export function shouldExcludeJob(
  jobTitle: string,
  description: string,
  excludeKeywords: string[]
): boolean {
  if (excludeKeywords.length === 0) return false
  const text = `${jobTitle} ${description}`.toLowerCase()
  return excludeKeywords.some(kw => text.includes(kw.toLowerCase()))
}

/**
 * Calculate a match score (0-100) based on keyword overlap.
 */
export function calculateKeywordScore(
  jobTitle: string,
  matchingGroups: KeywordGroup[]
): number {
  if (matchingGroups.length === 0) return 0

  // Best single-group match: how many of the profile title words appear
  const best = matchingGroups[0]
  const titleWords = extractSignificantWords(jobTitle)

  // Count how many title words from the job also appear in the profile title
  const profileWordSet = new Set(best.words)
  const jobWordSet = new Set(titleWords)

  // Bidirectional overlap
  const profileInJob = best.words.filter(w => jobWordSet.has(w)).length / best.words.length
  const jobInProfile = titleWords.filter(w => profileWordSet.has(w)).length / Math.max(titleWords.length, 1)

  // Combined score: weight profile coverage higher
  const overlap = profileInJob * 0.7 + jobInProfile * 0.3

  // Bonus for matching multiple profiles
  const multiProfileBonus = Math.min(0.1, (matchingGroups.length - 1) * 0.05)

  const raw = Math.min(1.0, overlap + multiProfileBonus)

  return Math.round(raw * 100)
}

/**
 * Build match reasons for display.
 */
export function buildMatchReasons(matchingGroups: KeywordGroup[]): string[] {
  const reasons: string[] = []
  const seenProfiles = new Set<string>()

  for (const group of matchingGroups) {
    if (!seenProfiles.has(group.profileName)) {
      seenProfiles.add(group.profileName)
      reasons.push(`Matches "${group.originalTitle}" from ${group.profileName}`)
    }
  }

  return reasons
}

/**
 * Build SQL LIKE patterns for a keyword group.
 * Returns an array of LIKE patterns (one per word) for use in SQL WHERE.
 * Note: SQL LIKE does substring matching — the JS word-boundary filter
 * is applied after fetching to remove false positives.
 */
export function buildSQLPatterns(groups: KeywordGroup[]): string[][] {
  return groups.map(group => group.words.map(word => `%${word}%`))
}
