import { NextRequest } from 'next/server'
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

/**
 * POST /api/chat/generate-outreach
 * Generate LinkedIn and email messages for recruiter outreach
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    const body = await request.json()

    const { jobDescription, recruiterName, company } = body

    if (!jobDescription) {
      return badRequestResponse('Job description is required')
    }

    // Get user's resume text for personalization
    const [user] = await db.select().from(users).where(eq(users.id, userId))

    const resumeContext = user?.resumeText
      ? `\n\nCandidate's Resume:\n${user.resumeText.substring(0, 2000)}`
      : ''

    // Generate LinkedIn message (300 char limit)
    const linkedinPrompt = `You are a professional career coach helping a job seeker craft a personalized LinkedIn connection request to a recruiter.

Job Description:
${jobDescription}

Recruiter Name: ${recruiterName || 'Hiring Manager'}
Company: ${company || 'the company'}
${resumeContext}

Generate a professional, concise LinkedIn connection request message that:
1. Is EXACTLY 300 characters or less (this is a hard limit)
2. Mentions the specific role
3. Highlights 1-2 relevant skills or experiences
4. Shows genuine interest
5. Is warm and professional

Output ONLY the message text, nothing else.`

    const linkedinResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: linkedinPrompt,
        },
      ],
    })

    const linkedinMessage =
      linkedinResponse.content[0].type === 'text'
        ? linkedinResponse.content[0].text.trim()
        : ''

    // Generate Email message
    const emailPrompt = `You are a professional career coach helping a job seeker craft a personalized email to a recruiter.

Job Description:
${jobDescription}

Recruiter Name: ${recruiterName || 'Hiring Manager'}
Company: ${company || 'the company'}
${resumeContext}

Generate a professional email message that:
1. Has a compelling subject line
2. Is concise (250-300 words max)
3. Highlights 2-3 key qualifications that match the role
4. Shows enthusiasm and cultural fit
5. Includes a clear call-to-action
6. Is professional yet personable

Format:
Subject: [subject line]

[email body]

Best regards,
[Candidate Name]`

    const emailResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: emailPrompt,
        },
      ],
    })

    const emailMessage =
      emailResponse.content[0].type === 'text' ? emailResponse.content[0].text.trim() : ''

    return successResponse({
      linkedinMessage: linkedinMessage.substring(0, 300), // Ensure 300 char limit
      emailMessage,
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('POST /api/chat/generate-outreach error:', error)
    return serverErrorResponse('Failed to generate outreach messages')
  }
}
