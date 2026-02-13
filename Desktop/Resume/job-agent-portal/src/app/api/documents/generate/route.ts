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
    const resumePrompt = `You are a professional resume writer. Based on the candidate's master resume and the target job description, create a tailored resume that highlights the most relevant experience and skills.

Master Resume:
${user.resumeText}

Target Job Description:
${jobDescription}

Job Title: ${jobTitle}
Company: ${company}

Create a tailored resume that:
1. Emphasizes relevant experience and skills
2. Uses keywords from the job description
3. Quantifies achievements where possible
4. Is ATS-friendly
5. Is concise and impactful

Format the output as sections:
SUMMARY
[Professional summary paragraph]

SKILLS
[Comma-separated skills]

EXPERIENCE
[Company Name] - [Job Title] ([Dates])
• [Achievement/responsibility]
• [Achievement/responsibility]

EDUCATION
[Degree] - [Institution] ([Year])

Output only the resume content in this format.`

    const resumeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{ role: 'user', content: resumePrompt }],
    })

    const resumeContent =
      resumeResponse.content[0].type === 'text' ? resumeResponse.content[0].text : ''

    // Generate cover letter content
    const coverLetterPrompt = `You are a professional cover letter writer. Create a compelling, personalized cover letter for this job application.

Candidate Resume:
${user.resumeText}

Job Description:
${jobDescription}

Job Title: ${jobTitle}
Company: ${company}

Create a cover letter that:
1. Opens with a strong hook
2. Connects candidate's experience to the role
3. Shows enthusiasm and cultural fit
4. Highlights 2-3 key achievements
5. Closes with a clear call-to-action
6. Is 250-300 words

Format:
[Today's Date]

Dear Hiring Manager,

[Opening paragraph]

[Body paragraph 1]

[Body paragraph 2]

[Closing paragraph]

Sincerely,
${userName}`

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
            }),
            ...resumeContent.split('\n').map(
              (line) =>
                new Paragraph({
                  children: [new TextRun(line)],
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
                children: [new TextRun(line)],
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
