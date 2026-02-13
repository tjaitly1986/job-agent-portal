'use client'

import { useEffect, useRef, useState } from 'react'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatWindowProps {
  conversationId?: string
  jobContext?: {
    title?: string
    company?: string
    location?: string
    description?: string
  }
  resumeId?: string
}

export function ChatWindow({ conversationId, jobContext, resumeId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [currentConversationId, setCurrentConversationId] = useState(conversationId)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load conversation history if conversationId provided
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId)
    }
  }, [conversationId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingMessage])

  const loadConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/chat?conversationId=${id}`)
      const data = await response.json()

      if (data.success && data.data.messages) {
        setMessages(
          data.data.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          }))
        )
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }

  const handleSendMessage = async (message: string) => {
    // Add user message to UI
    const userMessage: Message = { role: 'user', content: message }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setStreamingMessage('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationId: currentConversationId,
          jobContext,
          resumeId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let assistantMessage = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))

            if (data.text) {
              assistantMessage += data.text
              setStreamingMessage(assistantMessage)
            }

            if (data.done) {
              // Streaming complete, add final message
              setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: assistantMessage },
              ])
              setStreamingMessage('')

              // Update conversation ID if new
              if (data.conversationId && !currentConversationId) {
                setCurrentConversationId(data.conversationId)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && !streamingMessage && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Start a conversation</p>
                <p className="text-sm">
                  Ask me to help you craft a message to a recruiter or hiring manager
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <ChatMessage key={idx} role={msg.role} content={msg.content} />
          ))}

          {streamingMessage && (
            <ChatMessage
              role="assistant"
              content={streamingMessage}
              isStreaming={true}
            />
          )}

          {isLoading && !streamingMessage && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>
    </Card>
  )
}
