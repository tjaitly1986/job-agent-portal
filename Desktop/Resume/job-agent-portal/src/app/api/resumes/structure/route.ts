import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { resumes } from '@/lib/db/schema'
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { eq, and, desc } from 'drizzle-orm'

export interface ResumeSection {
  id: string
  label: string
  type: 'section' | 'experience'
}

/**
 * Parse resume text to extract section headings and experience entries.
 * Works with common resume formats:
 *  - Section headings: ALL CAPS lines (e.g., "PROFESSIONAL SUMMARY", "TECHNICAL SKILLS")
 *  - Experience entries: "Client: Company Name - Location" with dates
 */
function parseResumeStructure(text: string): ResumeSection[] {
  const sections: ResumeSection[] = []
  const lines = text.split('\n')

  // Known main section keywords (lowercased for matching)
  const sectionMap: Record<string, { id: string; label: string }> = {
    'professional summary': { id: 'summary', label: 'Profile Summary' },
    'profile summary': { id: 'summary', label: 'Profile Summary' },
    'summary': { id: 'summary', label: 'Profile Summary' },
    'executive summary': { id: 'summary', label: 'Profile Summary' },
    'technical skills': { id: 'skills', label: 'Technical Skills' },
    'skills': { id: 'skills', label: 'Technical Skills' },
    'core competencies': { id: 'skills', label: 'Technical Skills' },
    'professional experience': { id: 'experience_header', label: 'Experience' },
    'work experience': { id: 'experience_header', label: 'Experience' },
    'experience': { id: 'experience_header', label: 'Experience' },
    'education & certification': { id: 'education', label: 'Education & Certification' },
    'education': { id: 'education', label: 'Education' },
    'certifications': { id: 'education', label: 'Certifications' },
  }

  // Always add Resume Heading first
  sections.push({ id: 'heading', label: 'Resume Heading', type: 'section' })

  const seenIds = new Set<string>(['heading'])
  let expIndex = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Check for main section headings (ALL CAPS or known keywords)
    const lower = trimmed.toLowerCase().replace(/[:\s]+$/, '')
    if (sectionMap[lower] && !seenIds.has(sectionMap[lower].id)) {
      const mapped = sectionMap[lower]
      // Don't add "experience_header" as a toggle — individual roles are toggles
      if (mapped.id !== 'experience_header') {
        sections.push({ id: mapped.id, label: mapped.label, type: 'section' })
        seenIds.add(mapped.id)
      }
      continue
    }

    // Check for experience entries: "Client: Company Name - Location" with optional dates
    const clientMatch = trimmed.match(/^Client:\s*(.+?)(?:\s{2,}|\t)/)
    if (clientMatch) {
      const clientInfo = clientMatch[1].trim()
      // Extract company name (before " - Location")
      const companyMatch = clientInfo.match(/^(.+?)\s*-\s*/)
      const companyName = companyMatch ? companyMatch[1].trim() : clientInfo

      // Extract dates from the same line
      const dateMatch = trimmed.match(/(\w{3}\s+\d{4}\s*[-–]\s*(?:\w{3}\s+\d{4}|Till\s+Date|Present))/i)
      const dates = dateMatch ? dateMatch[1].trim() : ''

      const label = dates ? `${companyName} (${dates})` : companyName
      sections.push({
        id: `exp_${expIndex}`,
        label,
        type: 'experience',
      })
      expIndex++
      continue
    }

    // Also detect "Company Name | Role | Dates" or "Company Name, Location  Dates" patterns
    // Common in non-Client: format resumes
    if (!trimmed.startsWith('Client:') && !trimmed.startsWith('-') && !trimmed.startsWith('•')) {
      const altCompanyMatch = trimmed.match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*(\w{3,4}\s+\d{4})/)
      if (altCompanyMatch) {
        const companyName = altCompanyMatch[1].trim()
        const dateMatch = trimmed.match(/(\w{3,4}\s+\d{4}\s*[-–]\s*(?:\w{3,4}\s+\d{4}|Present))/i)
        const dates = dateMatch ? dateMatch[1].trim() : ''
        const label = dates ? `${companyName} (${dates})` : companyName
        sections.push({
          id: `exp_${expIndex}`,
          label,
          type: 'experience',
        })
        expIndex++
      }
    }
  }

  // Always add Cover Letter at the end
  sections.push({ id: 'coverLetter', label: 'Cover Letter', type: 'section' })

  return sections
}

/**
 * GET /api/resumes/structure?resumeId=xxx
 * Parse a resume and return its section structure for the UI toggles.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    const resumeId = request.nextUrl.searchParams.get('resumeId')

    let resumeText: string | null = null

    if (resumeId) {
      const [resume] = await db
        .select({ parsedText: resumes.parsedText })
        .from(resumes)
        .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
        .limit(1)
      resumeText = resume?.parsedText || null
    } else {
      // Get default or most recent resume
      const [defaultResume] = await db
        .select({ parsedText: resumes.parsedText })
        .from(resumes)
        .where(and(eq(resumes.userId, userId), eq(resumes.isDefault, true)))
        .limit(1)

      if (defaultResume?.parsedText) {
        resumeText = defaultResume.parsedText
      } else {
        const [latest] = await db
          .select({ parsedText: resumes.parsedText })
          .from(resumes)
          .where(eq(resumes.userId, userId))
          .orderBy(desc(resumes.createdAt))
          .limit(1)
        resumeText = latest?.parsedText || null
      }
    }

    if (!resumeText) {
      return badRequestResponse('No resume found. Please upload a resume first.')
    }

    const sections = parseResumeStructure(resumeText)
    return successResponse({ sections })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('GET /api/resumes/structure error:', error)
    return serverErrorResponse('Failed to parse resume structure')
  }
}
