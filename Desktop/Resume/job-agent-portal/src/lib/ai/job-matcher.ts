/**
 * Job Matcher - Calculate match scores between jobs and user resume
 */

import { Job } from '@/types/job'
import { ParsedResume } from './resume-parser'

export interface JobMatch {
  job: Job
  matchScore: number
  matchReasons: string[]
  whyGoodFit: string
}

interface MatchWeights {
  skills: number
  title: number
  salary: number
  location: number
  remote: number
  recency: number
}

const DEFAULT_WEIGHTS: MatchWeights = {
  skills: 0.40,    // 40% weight on skills match
  title: 0.20,     // 20% weight on title/role match
  salary: 0.15,    // 15% weight on salary alignment
  location: 0.10,  // 10% weight on location match
  remote: 0.10,    // 10% weight on remote preference
  recency: 0.05,   // 5% weight on job posting recency
}

/**
 * Calculate match score between a job and user's parsed resume
 */
export function calculateJobMatch(
  job: Job,
  parsedResume: ParsedResume,
  weights: MatchWeights = DEFAULT_WEIGHTS
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let totalScore = 0

  // 1. Skills Match (40%)
  const skillsScore = calculateSkillsMatch(job, parsedResume, reasons)
  totalScore += skillsScore * weights.skills

  // 2. Title/Role Match (20%)
  const titleScore = calculateTitleMatch(job, parsedResume, reasons)
  totalScore += titleScore * weights.title

  // 3. Salary Match (15%)
  const salaryScore = calculateSalaryMatch(job, parsedResume, reasons)
  totalScore += salaryScore * weights.salary

  // 4. Location Match (10%)
  const locationScore = calculateLocationMatch(job, parsedResume, reasons)
  totalScore += locationScore * weights.location

  // 5. Remote Preference Match (10%)
  const remoteScore = calculateRemoteMatch(job, parsedResume, reasons)
  totalScore += remoteScore * weights.remote

  // 6. Recency Bonus (5%)
  const recencyScore = calculateRecencyScore(job, reasons)
  totalScore += recencyScore * weights.recency

  // Normalize to 0-100
  const finalScore = Math.round(totalScore * 100)

  return {
    score: Math.min(100, Math.max(0, finalScore)),
    reasons,
  }
}

/**
 * Calculate skills overlap score
 */
function calculateSkillsMatch(
  job: Job,
  resume: ParsedResume,
  reasons: string[]
): number {
  const jobText = `${job.title} ${job.description || ''} ${job.requirements || ''}`.toLowerCase()
  const userSkills = [
    ...resume.skills.technical,
    ...resume.skills.soft,
  ].map(s => s.toLowerCase())

  if (userSkills.length === 0) return 0.5 // Default if no skills parsed

  let matchedSkills = 0
  const matchedSkillNames: string[] = []

  for (const skill of userSkills) {
    if (jobText.includes(skill)) {
      matchedSkills++
      matchedSkillNames.push(skill)
    }
  }

  const skillMatchRatio = matchedSkills / Math.max(userSkills.length, 1)

  if (matchedSkills > 0) {
    const topSkills = matchedSkillNames.slice(0, 5).join(', ')
    reasons.push(`Matches ${matchedSkills} of your skills: ${topSkills}${matchedSkills > 5 ? ', ...' : ''}`)
  }

  return skillMatchRatio
}

/**
 * Calculate job title/role match
 */
function calculateTitleMatch(
  job: Job,
  resume: ParsedResume,
  reasons: string[]
): number {
  const jobTitle = job.title.toLowerCase()
  const userTitles = [
    ...resume.experience.jobTitles,
    ...resume.preferences.desiredRoles,
  ].map(t => t.toLowerCase())

  // Check for exact or partial title match
  for (const userTitle of userTitles) {
    if (jobTitle.includes(userTitle) || userTitle.includes(jobTitle)) {
      reasons.push(`Role aligns with your experience: ${job.title}`)
      return 1.0
    }
  }

  // Check for seniority level match
  const seniorityKeywords = ['senior', 'lead', 'principal', 'staff', 'junior', 'mid-level']
  const jobSeniority = seniorityKeywords.find(k => jobTitle.includes(k))
  const userSeniority = userTitles.some(t => jobSeniority && t.includes(jobSeniority))

  if (userSeniority && jobSeniority) {
    reasons.push(`Seniority level (${jobSeniority}) matches your experience`)
    return 0.8
  }

  return 0.3 // Partial credit if no direct match
}

/**
 * Calculate salary alignment
 */
function calculateSalaryMatch(
  job: Job,
  resume: ParsedResume,
  reasons: string[]
): number {
  const { minSalary, maxSalary } = resume.preferences

  if (!job.salaryMin && !job.salaryMax) {
    return 0.5 // Neutral if salary not specified
  }

  if (!minSalary && !maxSalary) {
    return 0.5 // Neutral if user preferences not set
  }

  const jobMin = job.salaryMin || 0
  const jobMax = job.salaryMax || jobMin
  const userMin = minSalary || 0
  const userMax = maxSalary || userMin

  // Check if ranges overlap
  if (jobMax >= userMin && jobMin <= userMax) {
    const salaryText = job.salaryText || `$${jobMin}-${jobMax}`
    reasons.push(`Salary range ${salaryText} aligns with your expectations`)
    return 1.0
  }

  // Partial credit if close
  const gap = Math.abs(jobMax - userMin)
  if (gap < 20000) {
    return 0.7
  }

  return 0.2
}

/**
 * Calculate location match
 */
function calculateLocationMatch(
  job: Job,
  resume: ParsedResume,
  reasons: string[]
): number {
  const preferredLocations = resume.preferences.locations.map(l => l.toLowerCase())
  const jobLocation = job.location.toLowerCase()

  // Check for exact location match
  for (const loc of preferredLocations) {
    if (jobLocation.includes(loc) || loc.includes(jobLocation)) {
      reasons.push(`Location matches: ${job.location}`)
      return 1.0
    }
  }

  // Check for "anywhere" or "remote" preference
  if (preferredLocations.some(l => l.includes('remote') || l.includes('anywhere'))) {
    return 0.7
  }

  return 0.3
}

/**
 * Calculate remote preference match
 */
function calculateRemoteMatch(
  job: Job,
  resume: ParsedResume,
  reasons: string[]
): number {
  const { remotePreference } = resume.preferences

  if (remotePreference === 'only' && job.isRemote) {
    reasons.push('Remote position matches your preference')
    return 1.0
  }

  if (remotePreference === 'only' && !job.isRemote) {
    return 0.0 // Hard filter for remote-only preference
  }

  if (remotePreference === 'no-preference') {
    return 0.5
  }

  return 0.5 // Hybrid or other
}

/**
 * Calculate recency bonus (jobs posted recently get higher score)
 */
function calculateRecencyScore(job: Job, reasons: string[]): number {
  const postedDate = new Date(job.postedAt)
  const now = new Date()
  const hoursAgo = (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60)

  if (hoursAgo < 6) {
    reasons.push('Posted within last 6 hours')
    return 1.0
  } else if (hoursAgo < 24) {
    reasons.push('Posted within last 24 hours')
    return 0.8
  } else if (hoursAgo < 72) {
    return 0.5
  }

  return 0.2
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
        whyGoodFit: generateFitExplanation(job, reasons, score),
      }
    })
    .sort((a, b) => b.matchScore - a.matchScore) // Sort by score descending
}

/**
 * Generate "Why this job?" explanation
 */
function generateFitExplanation(
  job: Job,
  reasons: string[],
  score: number
): string {
  if (score >= 85) {
    return `Excellent match! ${reasons.slice(0, 2).join('. ')}.`
  } else if (score >= 70) {
    return `Good fit. ${reasons[0] || 'Aligns with your profile'}.`
  } else if (score >= 50) {
    return `Potential opportunity. ${reasons[0] || 'Some skills match'}.`
  } else {
    return 'Consider if interested in this direction.'
  }
}
