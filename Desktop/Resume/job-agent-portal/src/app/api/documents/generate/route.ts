import { NextRequest } from 'next/server'
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { users, resumes } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
} from 'docx'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

/**
 * Get the user's resume text from the resumes table (actual uploads),
 * falling back to users.resumeText (seed data) if no uploads exist
 */
async function getResumeText(userId: string): Promise<{ text: string; name: string } | null> {
  // First try to get the default uploaded resume
  const defaultResume = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.userId, userId), eq(resumes.isDefault, true)))
    .limit(1)

  if (defaultResume[0]?.parsedText) {
    const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId))
    return { text: defaultResume[0].parsedText, name: user?.name || 'Candidate' }
  }

  // If no default, try the most recent uploaded resume
  const latestResume = await db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.createdAt))
    .limit(1)

  if (latestResume[0]?.parsedText) {
    const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId))
    return { text: latestResume[0].parsedText, name: user?.name || 'Candidate' }
  }

  // Fall back to users.resumeText (seed data)
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  if (user?.resumeText) {
    return { text: user.resumeText, name: user.name || 'Candidate' }
  }

  return null
}

/**
 * Detect section headings and structure from resume text.
 * Returns an array of { type: 'heading' | 'subheading' | 'text' | 'bullet' | 'blank', content: string }
 */
function parseResumeStructure(
  text: string
): Array<{ type: 'heading' | 'subheading' | 'text' | 'bullet' | 'divider' | 'blank'; content: string }> {
  const lines = text.split('\n')
  const result: Array<{
    type: 'heading' | 'subheading' | 'text' | 'bullet' | 'divider' | 'blank'
    content: string
  }> = []

  // Common resume section headings
  const sectionHeadings = [
    'summary',
    'professional summary',
    'executive summary',
    'objective',
    'experience',
    'professional experience',
    'work experience',
    'employment history',
    'education',
    'skills',
    'technical skills',
    'core competencies',
    'certifications',
    'certificates',
    'projects',
    'achievements',
    'awards',
    'publications',
    'interests',
    'hobbies',
    'languages',
    'references',
    'volunteer',
    'volunteering',
    'training',
    'professional development',
    'contact',
    'contact information',
  ]

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === '') {
      result.push({ type: 'blank', content: '' })
      continue
    }

    // Detect dividers (lines of dashes, equals, underscores)
    if (/^[-=_]{3,}$/.test(trimmed)) {
      result.push({ type: 'divider', content: trimmed })
      continue
    }

    // Detect bullet points
    if (/^[•\-–—\*▪◦○►▸➤✓✔]/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
      result.push({ type: 'bullet', content: trimmed })
      continue
    }

    // Detect section headings (all caps, or matches known headings)
    const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 2 && /[A-Z]/.test(trimmed)
    const isKnownHeading = sectionHeadings.some(
      (h) => trimmed.toLowerCase().replace(/[:\s]/g, '') === h.replace(/\s/g, '')
    )

    if (isAllCaps || isKnownHeading) {
      result.push({ type: 'heading', content: trimmed })
      continue
    }

    // Detect subheadings (lines that look like job titles / company names / dates)
    // Usually short, may contain dates like "2020 - Present" or "Jan 2020 - Dec 2023"
    const hasDatePattern = /\d{4}\s*[-–—]\s*(present|\d{4})/i.test(trimmed)
    const isShortLine = trimmed.length < 80 && !trimmed.includes('.')
    if (hasDatePattern || (isShortLine && result.length > 0 && result[result.length - 1].type === 'heading')) {
      result.push({ type: 'subheading', content: trimmed })
      continue
    }

    result.push({ type: 'text', content: trimmed })
  }

  return result
}

/**
 * Build a Word document from structured resume content
 */
function buildResumeDocument(
  content: string,
  candidateName: string
): Document {
  const structure = parseResumeStructure(content)
  const children: Paragraph[] = []

  for (const item of structure) {
    switch (item.type) {
      case 'heading':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: item.content,
                bold: true,
                font: 'Calibri',
                size: 24, // 12pt
                color: '1a1a1a',
              }),
            ],
            spacing: { before: 240, after: 60 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
            },
          })
        )
        break

      case 'subheading':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: item.content,
                bold: true,
                font: 'Calibri',
                size: 22, // 11pt
                color: '333333',
              }),
            ],
            spacing: { before: 120, after: 40 },
          })
        )
        break

      case 'bullet':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: item.content,
                font: 'Calibri',
                size: 22,
              }),
            ],
            indent: { left: 360 },
            spacing: { before: 20, after: 20 },
          })
        )
        break

      case 'divider':
        children.push(
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' },
            },
            spacing: { before: 60, after: 60 },
          })
        )
        break

      case 'blank':
        children.push(
          new Paragraph({
            spacing: { before: 60, after: 60 },
          })
        )
        break

      default: // text
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: item.content,
                font: 'Calibri',
                size: 22,
              }),
            ],
            spacing: { before: 20, after: 20 },
          })
        )
    }
  }

  // Add candidate name as the first heading if not already present
  const firstHeading = structure.find((s) => s.type === 'heading' || s.type === 'text')
  const nameAlreadyPresent =
    firstHeading && firstHeading.content.toLowerCase().includes(candidateName.toLowerCase())

  if (!nameAlreadyPresent) {
    children.unshift(
      new Paragraph({
        children: [
          new TextRun({
            text: candidateName.toUpperCase(),
            bold: true,
            font: 'Calibri',
            size: 28, // 14pt
            color: '1a1a1a',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      })
    )
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 }, // 0.5 inch margins
          },
        },
        children,
      },
    ],
  })
}

/**
 * POST /api/documents/generate
 * Generate customized resume and cover letter in Word format
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    const body = await request.json()

    const { jobDescription, jobTitle, company } = body

    if (!jobDescription) {
      return badRequestResponse('Job description is required')
    }

    // Get user's actual uploaded resume (not seed data)
    const resumeData = await getResumeText(userId)

    if (!resumeData) {
      return badRequestResponse('Please upload your resume first in the Resumes section')
    }

    const { text: originalResumeText, name: userName } = resumeData

    // Use AI to tailor the resume for the job description
    const resumeTailoringPrompt = `You are a professional resume writer. Your task is to tailor the candidate's existing resume for a specific job description.

CRITICAL RULES:
1. PRESERVE THE EXACT STRUCTURE AND FORMAT of the original resume - same sections, same order, same layout pattern
2. Do NOT remove any sections from the original resume
3. Do NOT change the candidate's name, contact information, education dates, company names, or job titles
4. Do NOT invent or fabricate any experience, companies, degrees, or certifications the candidate does not have
5. Do NOT use any markdown formatting (no **, no __, no #, no italics markers)
6. Output PLAIN TEXT ONLY - the output will be formatted as a Word document
7. Keep the same length as the original resume (do not shorten it significantly)

WHAT YOU SHOULD DO:
1. Read the job description carefully and identify key skills, technologies, and requirements
2. Review the candidate's existing resume and identify where relevant skills already exist
3. Enhance bullet points to better highlight skills that match the job description
4. Add relevant keywords from the JD naturally into existing bullet points where truthful
5. Adjust the professional summary/objective to align with the target role
6. Reorder bullet points within each role to prioritize the most relevant accomplishments first
7. If the candidate has skills matching the JD that aren't prominently featured, make them more visible
8. Ensure technical skills section includes relevant technologies mentioned in both the resume and JD

ORIGINAL RESUME:
${originalResumeText}

JOB DESCRIPTION:
${jobDescription}

Job Title: ${jobTitle || 'the position'}
Company: ${company || 'the company'}

Now output the tailored resume. Preserve the EXACT same structure, sections, and formatting pattern as the original. Only modify content within the existing structure to better align with the job description. Output plain text only.`

    const resumeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{ role: 'user', content: resumeTailoringPrompt }],
    })

    const tailoredResumeContent =
      resumeResponse.content[0].type === 'text' ? resumeResponse.content[0].text : originalResumeText

    // Generate cover letter content
    const coverLetterPrompt = `You are a professional cover letter writer. Create a compelling, personalized cover letter for this job application.

CRITICAL FORMATTING INSTRUCTIONS:
- Do NOT use any markdown formatting (no **, no __, no italics markers)
- Write in plain text only
- Do not include any special formatting symbols
- The output will be formatted as a Word document

Candidate Resume:
${originalResumeText}

Job Description:
${jobDescription}

Job Title: ${jobTitle}
Company: ${company}

Create a professional cover letter that:
1. Opens with a strong hook showing genuine interest
2. Connects candidate's experience to the role requirements
3. Shows enthusiasm and cultural fit
4. Highlights 2-3 key achievements relevant to the position
5. Closes with a clear call-to-action
6. Is 250-300 words
7. Uses plain text only - no markdown formatting

Format:
[Today's Date]

Dear Hiring Manager,

[Opening paragraph]

[Body paragraph 1]

[Body paragraph 2]

[Closing paragraph]

Sincerely,
${userName}

Remember: Output plain text only. No asterisks, no underscores, no markdown symbols.`

    const coverLetterResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      messages: [{ role: 'user', content: coverLetterPrompt }],
    })

    const coverLetterContent =
      coverLetterResponse.content[0].type === 'text' ? coverLetterResponse.content[0].text : ''

    // Create Word documents
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'generated')
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true })
    }

    const timestamp = Date.now()
    const resumeFilename = `resume_${userId}_${timestamp}.docx`
    const coverLetterFilename = `cover_letter_${userId}_${timestamp}.docx`

    // Create resume document with proper structure detection
    const resumeDoc = buildResumeDocument(tailoredResumeContent, userName)

    // Create cover letter document
    const coverLetterDoc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1 inch margins
            },
          },
          children: coverLetterContent.split('\n').map(
            (line) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    font: 'Calibri',
                    size: 22, // 11pt
                  }),
                ],
                spacing: { after: 120 },
              })
          ),
        },
      ],
    })

    // Save documents
    const resumeBuffer = await Packer.toBuffer(resumeDoc)
    const coverLetterBuffer = await Packer.toBuffer(coverLetterDoc)

    await writeFile(join(uploadsDir, resumeFilename), resumeBuffer)
    await writeFile(join(uploadsDir, coverLetterFilename), coverLetterBuffer)

    return successResponse({
      resumeUrl: `/uploads/generated/${resumeFilename}`,
      coverLetterUrl: `/uploads/generated/${coverLetterFilename}`,
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('POST /api/documents/generate error:', error)
    return serverErrorResponse('Failed to generate documents')
  }
}
