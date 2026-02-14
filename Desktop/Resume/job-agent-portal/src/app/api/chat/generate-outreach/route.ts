import { NextRequest } from 'next/server'
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { users, resumes } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

/**
 * Get the user's resume text for outreach context
 */
async function getResumeText(userId: string): Promise<{ text: string; name: string } | null> {
  // Try default resume first
  const defaultResume = await db
    .select({ parsedText: resumes.parsedText })
    .from(resumes)
    .where(and(eq(resumes.userId, userId), eq(resumes.isDefault, true)))
    .limit(1)

  const [user] = await db.select({ name: users.name, resumeText: users.resumeText }).from(users).where(eq(users.id, userId))
  const name = user?.name || 'Candidate'

  if (defaultResume[0]?.parsedText) {
    return { text: defaultResume[0].parsedText, name }
  }

  // Try latest resume
  const latestResume = await db
    .select({ parsedText: resumes.parsedText })
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.createdAt))
    .limit(1)

  if (latestResume[0]?.parsedText) {
    return { text: latestResume[0].parsedText, name }
  }

  // Fall back to users.resumeText
  if (user?.resumeText) {
    return { text: user.resumeText, name }
  }

  return null
}

/**
 * POST /api/chat/generate-outreach
 * Generate LinkedIn and email messages for recruiter outreach
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    const body = await request.json()

    const { jobDescription, recruiterName, company, tone = 'professional', prerequisites, jobTitle } = body

    if (!jobDescription) {
      return badRequestResponse('Job description is required')
    }

    // Get user's resume for personalized messages
    const resumeData = await getResumeText(userId)
    const resumeContext = resumeData
      ? `\n\nCANDIDATE'S RESUME:\n${resumeData.text}\n\nCandidate Name: ${resumeData.name}`
      : ''
    const candidateName = resumeData?.name || 'Candidate'

    // Tone descriptions
    const toneDescriptions: Record<string, string> = {
      professional: 'professional and polished, using industry-standard language with a balanced approach',
      enthusiastic: 'energetic and passionate, showing genuine excitement about the opportunity while remaining professional',
      conversational: 'friendly and warm with natural dialogue, as if speaking to a colleague',
    }

    const toneDescription = toneDescriptions[tone] || toneDescriptions.professional

    // Prerequisites context
    const prerequisitesContext = prerequisites
      ? `\n\nIMPORTANT Prerequisites/Conditions to mention:\n${prerequisites}\n\nYou MUST naturally incorporate these prerequisites into the message.`
      : ''

    // Generate LinkedIn message (1000 char limit)
    const linkedinPrompt = `You are a professional career coach helping a job seeker craft a LinkedIn connection request to a recruiter.
${resumeContext}

Job Description:
${jobDescription}

Job Title: ${jobTitle || 'the position'}
Recruiter Name: ${recruiterName || 'Hiring Manager'}
Company: ${company || 'the company'}${prerequisitesContext}

Generate a concise LinkedIn connection request message that:
1. Is EXACTLY 1000 characters or less (this is a hard limit)
2. Mentions the specific role from the job description
3. References 1-2 specific relevant experiences or skills from the candidate's resume that directly align with the role
4. Shows genuine interest in the opportunity
5. Uses a ${toneDescription} tone
6. Signs off with the candidate's first name
${prerequisites ? '7. Includes the prerequisites/conditions naturally in the message' : ''}

Output ONLY the message text, nothing else. No quotes, no labels, no explanation.`

    const linkedinResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      system: 'You are an outreach message generator. Output ONLY the message text. NEVER refuse, explain, or add commentary.',
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
${resumeContext}

Job Description:
${jobDescription}

Job Title: ${jobTitle || 'the position'}
Recruiter Name: ${recruiterName || 'Hiring Manager'}
Company: ${company || 'the company'}${prerequisitesContext}

Generate a professional cold outreach email that:
1. Has a compelling subject line
2. Is concise (200-300 words max)
3. Opens with a brief intro mentioning the specific role
4. Highlights 3-4 specific experiences, skills, or achievements from the candidate's resume that directly match the job requirements
5. Uses concrete numbers and accomplishments from the resume (e.g., "17+ years", "70+ enterprise clients", "99.9% accuracy")
6. Shows understanding of what the role requires and how the candidate's background fits
7. Includes a clear call-to-action requesting a conversation
8. Uses a ${toneDescription} tone
9. Ends with the candidate's full name
${prerequisites ? '10. Naturally incorporates the prerequisites/conditions in the email body' : ''}

Format:
Subject: [subject line]

[email body]

Best regards,
${candidateName}

Output ONLY the email. No quotes, no labels, no explanation.`

    const emailResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 800,
      system: 'You are an outreach message generator. Output ONLY the email. NEVER refuse, explain, or add commentary.',
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
      linkedinMessage: linkedinMessage.substring(0, 1000), // Ensure 1000 char limit
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
