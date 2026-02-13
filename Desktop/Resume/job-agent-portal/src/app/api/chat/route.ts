import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { badRequestResponse, serverErrorResponse } from '@/lib/api/response'
import { db } from '@/lib/db'
import { chatConversations, chatMessages, resumes } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

/**
 * POST /api/chat
 * Send a message to the AI chatbot and stream the response
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    const body = await request.json()

    const { message, conversationId, jobContext, resumeId } = body

    if (!message) {
      return badRequestResponse('Message is required')
    }

    // Get or create conversation
    let conversation
    if (conversationId) {
      const existing = await db.query.chatConversations.findFirst({
        where: and(
          eq(chatConversations.id, conversationId),
          eq(chatConversations.userId, userId)
        ),
      })
      if (!existing) {
        return badRequestResponse('Conversation not found')
      }
      conversation = existing
    } else {
      // Create new conversation
      const [newConv] = await db
        .insert(chatConversations)
        .values({
          userId,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        })
        .returning()
      conversation = newConv
    }

    // Get user's default resume if resumeId provided
    let resumeText = ''
    if (resumeId) {
      const resume = await db.query.resumes.findFirst({
        where: and(eq(resumes.id, resumeId), eq(resumes.userId, userId)),
      })
      if (resume) {
        resumeText = resume.parsedText || ''
      }
    } else {
      // Get default resume
      const defaultResume = await db.query.resumes.findFirst({
        where: and(eq(resumes.userId, userId), eq(resumes.isDefault, true)),
      })
      if (defaultResume) {
        resumeText = defaultResume.parsedText || ''
      }
    }

    // Get conversation history
    const history = await db.query.chatMessages.findMany({
      where: eq(chatMessages.conversationId, conversation.id),
      orderBy: [desc(chatMessages.createdAt)],
      limit: 10, // Last 10 messages for context
    })

    // Build system prompt
    const systemPrompt = buildSystemPrompt(resumeText, jobContext)

    // Build messages array for Claude
    const messages: Anthropic.MessageParam[] = []

    // Add conversation history (in reverse order, oldest first)
    history.reverse().forEach((msg) => {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    })

    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    })

    // Save user message
    await db.insert(chatMessages).values({
      conversationId: conversation.id,
      role: 'user',
      content: message,
    })

    // Stream response from Claude
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages,
    })

    // Create a readable stream for the response
    const encoder = new TextEncoder()
    let assistantMessage = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta') {
              if (chunk.delta.type === 'text_delta') {
                const text = chunk.delta.text
                assistantMessage += text
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                )
              }
            }
          }

          // Save assistant message to database
          await db.insert(chatMessages).values({
            conversationId: conversation.id,
            role: 'assistant',
            content: assistantMessage,
          })

          // Send final event with conversation ID
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, conversationId: conversation.id })}\n\n`
            )
          )
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('POST /api/chat error:', error)
    return serverErrorResponse('Failed to process chat message')
  }
}

/**
 * GET /api/chat
 * Get user's chat conversations
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (conversationId) {
      // Get specific conversation with messages
      const conversation = await db.query.chatConversations.findFirst({
        where: and(
          eq(chatConversations.id, conversationId),
          eq(chatConversations.userId, userId)
        ),
      })

      if (!conversation) {
        return badRequestResponse('Conversation not found')
      }

      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.conversationId, conversationId),
        orderBy: [chatMessages.createdAt],
      })

      return Response.json({
        success: true,
        data: {
          conversation,
          messages,
        },
      })
    } else {
      // Get all conversations
      const conversations = await db.query.chatConversations.findMany({
        where: eq(chatConversations.userId, userId),
        orderBy: [desc(chatConversations.updatedAt)],
      })

      return Response.json({
        success: true,
        data: conversations,
      })
    }
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('GET /api/chat error:', error)
    return serverErrorResponse('Failed to fetch conversations')
  }
}

/**
 * DELETE /api/chat
 * Delete a conversation
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return badRequestResponse('Conversation ID is required')
    }

    // Verify ownership
    const conversation = await db.query.chatConversations.findFirst({
      where: and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.userId, userId)
      ),
    })

    if (!conversation) {
      return badRequestResponse('Conversation not found')
    }

    // Delete messages first (foreign key constraint)
    await db.delete(chatMessages).where(eq(chatMessages.conversationId, conversationId))

    // Delete conversation
    await db.delete(chatConversations).where(eq(chatConversations.id, conversationId))

    return Response.json({
      success: true,
      message: 'Conversation deleted',
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('DELETE /api/chat error:', error)
    return serverErrorResponse('Failed to delete conversation')
  }
}

function buildSystemPrompt(resumeText: string, jobContext?: any): string {
  let prompt = `You are an AI career assistant helping a job seeker craft personalized outreach messages to recruiters and hiring managers.

Your role is to:
1. Generate professional, personalized messages for LinkedIn connection requests, InMails, and emails
2. Highlight relevant skills and experiences from the candidate's resume
3. Show genuine interest in specific roles and companies
4. Keep messages concise and action-oriented
5. Maintain a professional yet friendly tone

`

  if (resumeText) {
    prompt += `CANDIDATE'S RESUME:
${resumeText}

`
  }

  if (jobContext) {
    prompt += `JOB CONTEXT:
Title: ${jobContext.title || 'N/A'}
Company: ${jobContext.company || 'N/A'}
Location: ${jobContext.location || 'N/A'}
Description: ${jobContext.description ? jobContext.description.substring(0, 500) : 'N/A'}

`
  }

  prompt += `When generating messages:
- For LinkedIn connection requests: Keep under 300 characters
- For InMails/emails: 150-250 words
- Always personalize based on the job/company
- Include a clear call-to-action
- Never sound desperate or generic
- Use the candidate's actual experience from their resume

If asked about general job search advice or strategy, provide helpful, actionable guidance.`

  return prompt
}
