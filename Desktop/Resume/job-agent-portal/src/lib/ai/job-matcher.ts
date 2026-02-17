/**
 * Job Matcher - Calculate match scores between jobs and user resume
 *
 * Scoring strategy:
 * - Skills overlap (35%): word-level matching with aliases
 * - Title/role fit (25%): word overlap + synonym matching
 * - Industry/domain (15%): keyword-based industry alignment
 * - Salary alignment (10%): range overlap check
 * - Location + remote (10%): preference matching
 * - Recency (5%): minor freshness bonus
 *
 * When a job has no description, scores are adjusted so title and
 * industry matching carry more weight (description-less jobs shouldn't
 * be penalised since they're from the user's own search query).
 */

import { Job } from '@/types/job'
import { ParsedResume } from './resume-parser'

export interface JobMatch {
  job: Job
  matchScore: number
  matchReasons: string[]
  whyGoodFit: string
}

// ── Skill aliases (bidirectional) ────────────────────────────────────────
const SKILL_ALIASES: Record<string, string[]> = {
  'javascript': ['js', 'es6', 'es2015', 'ecmascript'],
  'typescript': ['ts'],
  'python': ['py', 'python3'],
  'machine learning': ['ml', 'deep learning', 'dl'],
  'artificial intelligence': ['ai', 'genai', 'generative ai'],
  'natural language processing': ['nlp'],
  'computer vision': ['cv'],
  'amazon web services': ['aws'],
  'google cloud platform': ['gcp', 'google cloud'],
  'microsoft azure': ['azure'],
  'ci/cd': ['cicd', 'continuous integration', 'continuous delivery'],
  'kubernetes': ['k8s'],
  'docker': ['containers', 'containerization'],
  'react': ['reactjs', 'react.js'],
  'angular': ['angularjs', 'angular.js'],
  'vue': ['vuejs', 'vue.js'],
  'node': ['nodejs', 'node.js'],
  'postgres': ['postgresql', 'psql'],
  'mongodb': ['mongo'],
  'sql server': ['mssql', 'microsoft sql'],
  'rest api': ['restful', 'rest apis', 'restful api'],
  'graphql': ['gql'],
  'project management': ['pm', 'program management'],
  'business intelligence': ['bi'],
  'extract transform load': ['etl'],
  'electronic data interchange': ['edi'],
  'enterprise resource planning': ['erp'],
  'customer relationship management': ['crm'],
  'software as a service': ['saas'],
  'devops': ['dev ops', 'site reliability', 'sre'],
  'agile': ['scrum', 'kanban', 'sprint'],
  'data engineering': ['data pipeline', 'data pipelines'],
  'data science': ['data scientist'],
  'full stack': ['fullstack', 'full-stack'],
  'front end': ['frontend', 'front-end'],
  'back end': ['backend', 'back-end'],
  'power bi': ['powerbi'],
  'tableau': ['data visualization'],
  'sap': ['sap erp', 'sap hana'],
  'salesforce': ['sfdc'],
}

// Build a reverse lookup: alias → canonical form
const ALIAS_TO_CANONICAL = new Map<string, string>()
for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
  ALIAS_TO_CANONICAL.set(canonical, canonical)
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(alias, canonical)
  }
}

// ── Title synonyms (groups of interchangeable role words) ────────────────
const TITLE_SYNONYM_GROUPS: string[][] = [
  ['engineer', 'developer', 'programmer', 'coder'],
  ['architect', 'designer', 'strategist'],
  ['manager', 'lead', 'head', 'director'],
  ['analyst', 'specialist', 'consultant', 'advisor'],
  ['solution', 'solutions'],
  ['senior', 'sr', 'sr.'],
  ['junior', 'jr', 'jr.'],
  ['data', 'analytics', 'information'],
  ['software', 'application', 'platform'],
  ['cloud', 'infrastructure', 'devops'],
  ['product', 'program', 'project'],
  ['deployment', 'implementation', 'integration'],
]

// ── Helpers ──────────────────────────────────────────────────────────────

/** Tokenise text into lowercase words, strip punctuation */
function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\/\.]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1)
}

/** Get the canonical skill form (or the word itself) */
function canonicalise(word: string): string {
  return ALIAS_TO_CANONICAL.get(word) || word
}

/** Check if two words are synonymous based on TITLE_SYNONYM_GROUPS */
function areTitleSynonyms(a: string, b: string): boolean {
  if (a === b) return true
  return TITLE_SYNONYM_GROUPS.some(group => group.includes(a) && group.includes(b))
}

// ── Scoring functions ───────────────────────────────────────────────────

function scoreSkills(
  job: Job,
  resume: ParsedResume,
  reasons: string[]
): number {
  const jobText = `${job.title} ${job.description || ''} ${job.requirements || ''}`.toLowerCase()
  const jobTokens = new Set(tokenise(jobText))
  const allUserSkills = [...resume.skills.technical, ...resume.skills.soft]

  if (allUserSkills.length === 0) return 0.6 // No skills parsed → generous default

  // Check full skill phrases first (e.g., "machine learning")
  const matchedPhrases: string[] = []
  for (const skill of allUserSkills) {
    const lower = skill.toLowerCase()
    const canonical = canonicalise(lower)

    // Check if the full phrase appears
    if (jobText.includes(lower) || jobText.includes(canonical)) {
      matchedPhrases.push(skill)
      continue
    }
    // Check aliases
    const aliases = SKILL_ALIASES[lower] || SKILL_ALIASES[canonical]
    if (aliases?.some(alias => jobText.includes(alias))) {
      matchedPhrases.push(skill)
      continue
    }
  }

  // Also check individual skill words vs job tokens
  let wordHits = 0
  const significantSkillWords = new Set<string>()
  for (const skill of allUserSkills) {
    for (const word of tokenise(skill)) {
      if (word.length >= 3) significantSkillWords.add(word)
    }
  }
  for (const word of significantSkillWords) {
    if (jobTokens.has(word) || jobTokens.has(canonicalise(word))) {
      wordHits++
    }
  }

  const phraseRatio = matchedPhrases.length / Math.max(allUserSkills.length, 1)
  const wordRatio = wordHits / Math.max(significantSkillWords.size, 1)

  // Combine: full-phrase matches count more
  const combined = phraseRatio * 0.7 + wordRatio * 0.3

  // If job has no description, the match is purely against title — give generous floor
  const hasDescription = Boolean(job.description || job.requirements)
  const floor = hasDescription ? 0.15 : 0.4

  const finalScore = Math.max(floor, combined)

  if (matchedPhrases.length > 0) {
    const top = matchedPhrases.slice(0, 4).join(', ')
    reasons.push(`Skills match: ${top}${matchedPhrases.length > 4 ? ` +${matchedPhrases.length - 4} more` : ''}`)
  } else if (wordHits > 0 && hasDescription) {
    reasons.push(`Related skill keywords found in description`)
  }

  return finalScore
}

function scoreTitle(
  job: Job,
  resume: ParsedResume,
  reasons: string[]
): number {
  const jobTitleTokens = tokenise(job.title)
  const userTitles = [
    ...resume.experience.jobTitles,
    ...resume.preferences.desiredRoles,
  ]

  if (userTitles.length === 0) return 0.5

  let bestOverlap = 0
  let bestTitle = ''

  for (const userTitle of userTitles) {
    const userTokens = tokenise(userTitle)
    if (userTokens.length === 0) continue

    // Count how many words in the user title match the job title (with synonyms)
    let matches = 0
    for (const uWord of userTokens) {
      for (const jWord of jobTitleTokens) {
        if (areTitleSynonyms(uWord, jWord) || canonicalise(uWord) === canonicalise(jWord)) {
          matches++
          break
        }
      }
    }

    const overlap = matches / userTokens.length
    if (overlap > bestOverlap) {
      bestOverlap = overlap
      bestTitle = userTitle
    }
  }

  if (bestOverlap >= 0.6) {
    reasons.push(`Role aligns with your experience as ${bestTitle}`)
  } else if (bestOverlap >= 0.3) {
    reasons.push(`Related to your ${bestTitle} background`)
  }

  // Scale: 100% overlap = 1.0, 50% = 0.75, 30% = 0.5, 0% = 0.25
  return Math.max(0.25, bestOverlap * 0.75 + 0.25)
}

function scoreIndustry(
  job: Job,
  resume: ParsedResume,
  reasons: string[]
): number {
  const jobText = `${job.title} ${job.company} ${job.description || ''}`.toLowerCase()
  const industries = resume.experience.industries.map(i => i.toLowerCase())

  if (industries.length === 0) return 0.5

  const matchedIndustries: string[] = []
  for (const industry of industries) {
    const industryWords = tokenise(industry)
    if (industryWords.some(w => jobText.includes(w))) {
      matchedIndustries.push(industry)
    }
  }

  if (matchedIndustries.length > 0) {
    reasons.push(`Relevant industry: ${matchedIndustries[0]}`)
    return Math.min(1.0, 0.6 + matchedIndustries.length * 0.2)
  }

  return 0.35
}

function scoreSalary(
  job: Job,
  resume: ParsedResume,
  reasons: string[]
): number {
  const { minSalary, maxSalary } = resume.preferences
  if (!job.salaryMin && !job.salaryMax) return 0.5
  if (!minSalary && !maxSalary) return 0.5

  const jobMin = job.salaryMin || 0
  const jobMax = job.salaryMax || jobMin
  const userMin = minSalary || 0
  const userMax = maxSalary || userMin

  if (jobMax >= userMin && jobMin <= userMax) {
    const formatAmt = (n: number) => job.salaryType === 'hourly' ? `$${n}/hr` : `$${Math.round(n / 1000)}k`
    reasons.push(`Salary ${formatAmt(jobMin)}-${formatAmt(jobMax)} fits your range`)
    return 1.0
  }

  const gap = Math.min(Math.abs(jobMax - userMin), Math.abs(jobMin - userMax))
  if (gap < 15) return 0.7 // close
  return 0.3
}

function scoreLocationAndRemote(
  job: Job,
  resume: ParsedResume,
  reasons: string[]
): number {
  const preferredLocations = resume.preferences.locations.map(l => l.toLowerCase())
  const jobLocation = job.location.toLowerCase()
  const { remotePreference } = resume.preferences

  let locationScore = 0.4
  let remoteScore = 0.5

  // Location check
  for (const loc of preferredLocations) {
    if (jobLocation.includes(loc) || loc.includes(jobLocation) ||
      (loc === 'united states' && !jobLocation.includes('canada') && !jobLocation.includes('uk'))) {
      locationScore = 1.0
      break
    }
  }
  if (preferredLocations.some(l => l.includes('remote') || l.includes('anywhere'))) {
    locationScore = Math.max(locationScore, 0.7)
  }

  // Remote check
  if (remotePreference === 'only') {
    remoteScore = job.isRemote ? 1.0 : 0.2
    if (job.isRemote) reasons.push('Remote position matches your preference')
  } else if (remotePreference === 'hybrid') {
    remoteScore = job.isRemote ? 0.8 : 0.6
  } else {
    remoteScore = 0.6
  }

  if (locationScore >= 0.9 && !reasons.some(r => r.includes('Remote'))) {
    reasons.push(`Location: ${job.location}`)
  }

  return locationScore * 0.5 + remoteScore * 0.5
}

function scoreRecency(job: Job): number {
  const postedDate = new Date(job.postedAt)
  const now = new Date()
  const hoursAgo = (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60)

  if (hoursAgo < 6) return 1.0
  if (hoursAgo < 24) return 0.8
  if (hoursAgo < 72) return 0.6
  if (hoursAgo < 168) return 0.4
  return 0.2
}

// ── Main scoring ────────────────────────────────────────────────────────

export function calculateJobMatch(
  job: Job,
  parsedResume: ParsedResume
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  const hasDescription = Boolean(job.description || job.requirements)

  // Adjust weights based on whether job has a description
  const weights = hasDescription
    ? { skills: 0.35, title: 0.25, industry: 0.15, salary: 0.10, locRemote: 0.10, recency: 0.05 }
    : { skills: 0.20, title: 0.35, industry: 0.20, salary: 0.10, locRemote: 0.10, recency: 0.05 }

  const skillsScore = scoreSkills(job, parsedResume, reasons)
  const titleScore = scoreTitle(job, parsedResume, reasons)
  const industryScore = scoreIndustry(job, parsedResume, reasons)
  const salaryScore = scoreSalary(job, parsedResume, reasons)
  const locRemoteScore = scoreLocationAndRemote(job, parsedResume, reasons)
  const recencyScore = scoreRecency(job)

  const raw =
    skillsScore * weights.skills +
    titleScore * weights.title +
    industryScore * weights.industry +
    salaryScore * weights.salary +
    locRemoteScore * weights.locRemote +
    recencyScore * weights.recency

  // Scale to 0-100 with a generous curve — since these jobs were found
  // via the user's own search profiles, they deserve a baseline
  const curved = applyCurve(raw)
  const finalScore = Math.round(curved * 100)

  return {
    score: Math.min(100, Math.max(0, finalScore)),
    reasons: reasons.length > 0 ? reasons : ['Matches your search criteria'],
  }
}

/**
 * Apply a generous curve so that:
 * - 0.30 raw → ~55 (decent match shown from user's own search)
 * - 0.50 raw → ~70 (good match)
 * - 0.70 raw → ~85 (excellent match)
 * - 0.90 raw → ~95
 */
function applyCurve(raw: number): number {
  // Piecewise linear: lift the floor, compress the top
  if (raw <= 0.15) return raw * 2          // 0-0.15 → 0-0.30
  if (raw <= 0.40) return 0.30 + (raw - 0.15) * 1.6  // 0.15-0.40 → 0.30-0.70
  if (raw <= 0.70) return 0.70 + (raw - 0.40) * 0.67  // 0.40-0.70 → 0.70-0.90
  return 0.90 + (raw - 0.70) * 0.33       // 0.70-1.0 → 0.90-1.0
}

/**
 * Batch calculate match scores for multiple jobs
 */
export function calculateJobMatches(
  jobs: Job[],
  parsedResume: ParsedResume
): JobMatch[] {
  return jobs
    .map(job => {
      const { score, reasons } = calculateJobMatch(job, parsedResume)
      return {
        job: {
          ...job,
          matchScore: score,
          matchReasons: reasons,
        },
        matchScore: score,
        matchReasons: reasons,
        whyGoodFit: generateFitExplanation(reasons, score),
      }
    })
    .sort((a, b) => b.matchScore - a.matchScore)
}

function generateFitExplanation(reasons: string[], score: number): string {
  if (score >= 85) {
    return `Excellent match! ${reasons.slice(0, 2).join('. ')}.`
  } else if (score >= 70) {
    return `Good fit. ${reasons[0] || 'Aligns with your profile'}.`
  } else if (score >= 55) {
    return `Potential opportunity. ${reasons[0] || 'Some alignment with your background'}.`
  } else {
    return 'Explore if interested in this direction.'
  }
}
