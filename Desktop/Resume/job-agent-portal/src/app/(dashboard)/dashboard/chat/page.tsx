'use client'

import { useState } from 'react'
import { ChatWindow } from '@/components/chat/chat-window'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export default function ChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>()
  const queryClient = useQueryClient()

  // Fetch conversations
  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await fetch('/api/chat')
      const data = await response.json()
      return data.success ? data.data : []
    },
  })

  // Delete conversation mutation
  const deleteConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await fetch(`/api/chat?conversationId=${conversationId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete conversation')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      if (selectedConversationId) {
        setSelectedConversationId(undefined)
      }
    },
  })

  const handleNewChat = () => {
    setSelectedConversationId(undefined)
  }

  const handleDeleteConversation = (conversationId: string) => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      deleteConversation.mutate(conversationId)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Chat Assistant</h1>
        <p className="text-muted-foreground mt-2">
          Get help crafting personalized outreach messages to recruiters and hiring managers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Conversation History */}
        <Card className="lg:col-span-1 p-4">
          <div className="space-y-4">
            <Button
              onClick={handleNewChat}
              className="w-full"
              variant="default"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Recent Conversations
              </h3>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : conversations && conversations.length > 0 ? (
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer transition-colors ${
                        selectedConversationId === conv.id ? 'bg-muted' : ''
                      }`}
                    >
                      <button
                        onClick={() => setSelectedConversationId(conv.id)}
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                      >
                        <MessageSquare className="h-4 w-4 shrink-0" />
                        <span className="text-sm truncate">{conv.title}</span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteConversation(conv.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No conversations yet
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <ChatWindow conversationId={selectedConversationId} />
        </div>
      </div>

      {/* Example Prompts */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Example Prompts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ExamplePrompt
            title="LinkedIn Connection Request"
            prompt="Write a LinkedIn connection request for a Software Engineer position at Google"
            onClick={() => setSelectedConversationId(undefined)}
          />
          <ExamplePrompt
            title="Email to Recruiter"
            prompt="Draft a professional email to a recruiter expressing interest in a Senior Developer role"
            onClick={() => setSelectedConversationId(undefined)}
          />
          <ExamplePrompt
            title="Follow-up Message"
            prompt="Create a follow-up message after applying to a job one week ago"
            onClick={() => setSelectedConversationId(undefined)}
          />
          <ExamplePrompt
            title="InMail Message"
            prompt="Write a LinkedIn InMail to a hiring manager for a Data Engineer position at Amazon"
            onClick={() => setSelectedConversationId(undefined)}
          />
        </div>
      </Card>
    </div>
  )
}

function ExamplePrompt({
  title,
  prompt,
  onClick,
}: {
  title: string
  prompt: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 text-left border rounded-lg hover:bg-muted transition-colors"
    >
      <h4 className="font-medium text-sm mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground">{prompt}</p>
    </button>
  )
}
