import { NextRequest } from 'next/server'
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
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
    await getUserIdFromRequest(request)
    const body = await request.json()

    const { jobDescription, recruiterName, company, tone = 'professional', prerequisites } = body

    if (!jobDescription) {
      return badRequestResponse('Job description is required')
    }

    // Tone descriptions
    const toneDescriptions: Record<string, string> = {
      professional: 'professional and polished, using industry-standard language with a balanced approach',
      enthusiastic: 'energetic and passionate, showing genuine excitement about the opportunity while remaining professional',
      conversational: 'friendly and warm with natural dialogue, as if speaking to a colleague',
    }

    const toneDescription = toneDescriptions[tone] || toneDescriptions.professional

    // Generate LinkedIn message (300 char limit)
    const prerequisitesContext = prerequisites
      ? `\n\nIMPORTANT Prerequisites/Conditions to mention:\n${prerequisites}\n\nYou MUST naturally incorporate these prerequisites into the message.`
      : ''

    const linkedinPrompt = `You are a professional career coach helping a job seeker craft a LinkedIn connection request to a recruiter.

Job Description:
${jobDescription}

Recruiter Name: ${recruiterName || 'Hiring Manager'}
Company: ${company || 'the company'}${prerequisitesContext}

Generate a concise LinkedIn connection request message that:
1. Is EXACTLY 300 characters or less (this is a hard limit)
2. Mentions the specific role from the job description
3. Expresses genuine interest in the opportunity
4. Is warm and professional
5. Uses a ${toneDescription} tone
6. Does NOT make claims about specific qualifications (keep it general)
${prerequisites ? '7. Includes the prerequisites/conditions naturally in the message' : ''}

Output ONLY the message text, nothing else. Do not refuse or explain - just generate the message.`

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
    const emailPrompt = `You are a professional career coach helping a job seeker craft a cold outreach email to a recruiter.

Job Description:
${jobDescription}

Recruiter Name: ${recruiterName || 'Hiring Manager'}
Company: ${company || 'the company'}${prerequisitesContext}

Generate a professional cold outreach email that:
1. Has a compelling subject line
2. Is concise (200-250 words max)
3. Expresses genuine interest in the role and company
4. Mentions what attracted them to the opportunity (based on job description)
5. Includes a clear call-to-action (e.g., "Would love to learn more")
6. Uses a ${toneDescription} tone
7. Does NOT make specific qualification claims (keep it general and interest-focused)
8. Ends with requesting a conversation or next steps
${prerequisites ? '9. Naturally incorporates the prerequisites/conditions in the email body' : ''}

Format:
Subject: [subject line]

[email body]

Best regards,
[Your Name]

Do not refuse or explain - just generate the email. Focus on expressing interest, not proving qualifications.`

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
