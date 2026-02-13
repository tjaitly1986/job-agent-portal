import { NextRequest } from 'next/server'
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

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

    // Get user's resume text
    const [user] = await db.select().from(users).where(eq(users.id, userId))

    if (!user?.resumeText) {
      return badRequestResponse('Please upload your resume first in the Resumes section')
    }

    const userName = user.name || 'Candidate'

    // Generate resume content
    const resumePrompt = `You are a professional resume writer. Tailor the candidate's resume to match the target job description while preserving the exact formatting, structure, and layout.

CRITICAL INSTRUCTIONS:
1. PRESERVE the exact format, structure, section order, and visual layout of the original resume
2. Keep all bullet points, spacing, and organizational structure identical
3. UPDATE the resume headline/title to match the target job title
4. ANALYZE the job description and identify key required skills and keywords
5. UPDATE the skills section to emphasize JD-relevant skills (keep existing skills but reorder/highlight relevant ones)
6. ADD new relevant skills from the JD if they're legitimately related to the candidate's experience
7. ENHANCE bullet points by adding relevant keywords from the JD where they naturally fit
8. REORDER experience bullet points to put most relevant items first
9. Keep the same level of detail and length - do not remove or significantly shorten content

Master Resume:
${user.resumeText}

Target Job Description:
${jobDescription}

Target Job Title: ${jobTitle}
Company: ${company}

Tailoring Strategy:
- Update resume headline to: "${jobTitle}" or similar role-specific title
- Identify top 5-7 skills from JD and ensure they appear prominently in skills section
- Add relevant JD keywords naturally into existing bullet points
- Reorder experience bullets to lead with most relevant achievements
- Maintain exact same formatting, spacing, and section structure

Output the complete tailored resume with all original formatting preserved.`

    const resumeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{ role: 'user', content: resumePrompt }],
    })

    const resumeContent =
      resumeResponse.content[0].type === 'text' ? resumeResponse.content[0].text : ''

    // Generate cover letter content
    const coverLetterPrompt = `You are a professional cover letter writer. Create a compelling, personalized cover letter for this job application.

CRITICAL FORMATTING INSTRUCTIONS:
- Do NOT use any markdown formatting (no **, no __, no italics markers)
- Write in plain text only
- Do not include any special formatting symbols
- The output will be formatted as a Word document

Candidate Resume:
${user.resumeText}

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

    // Create resume document
    const resumeDoc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: userName.toUpperCase(),
              heading: HeadingLevel.HEADING_1,
              font: 'Calibri',
            }),
            ...resumeContent.split('\n').map(
              (line) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: line,
                      font: 'Calibri',
                      size: 22, // 11pt (size is in half-points)
                    }),
                  ],
                })
            ),
          ],
        },
      ],
    })

    // Create cover letter document
    const coverLetterDoc = new Document({
      sections: [
        {
          children: coverLetterContent.split('\n').map(
            (line) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    font: 'Calibri',
                    size: 22, // 11pt (size is in half-points)
                  }),
                ],
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
