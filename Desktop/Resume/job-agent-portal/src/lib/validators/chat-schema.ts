import { z } from 'zod'

// Message types
export const messageTypeSchema = z.enum([
  'linkedin_request',
  'linkedin_inmail',
  'email',
  'followup',
  'general',
])

// Create conversation
export const createConversationSchema = z.object({
  jobId: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
  messageType: messageTypeSchema.default('general'),
  context: z
    .object({
      resumeId: z.string().uuid().optional(),
      recruiterName: z.string().optional(),
      recruiterCompany: z.string().optional(),
      jobTitle: z.string().optional(),
    })
    .optional(),
})

// Send message
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10000),
})

// Create conversation with first message
export const createConversationWithMessageSchema = z.object({
  jobId: z.string().uuid().optional(),
  messageType: messageTypeSchema.default('general'),
  content: z.string().min(1).max(10000),
  context: z
    .object({
      resumeId: z.string().uuid().optional(),
      recruiterName: z.string().optional(),
      recruiterCompany: z.string().optional(),
      jobTitle: z.string().optional(),
    })
    .optional(),
})

export type MessageType = z.infer<typeof messageTypeSchema>
export type CreateConversationInput = z.infer<typeof createConversationSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type CreateConversationWithMessageInput = z.infer<typeof createConversationWithMessageSchema>
