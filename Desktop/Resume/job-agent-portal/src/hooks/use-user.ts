'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

const API_BASE = '/api'

interface User {
  id: string
  email: string
  name: string
  image: string | null
  phone: string | null
  linkedinUrl: string | null
  location: string | null
  resumeText: string | null
  preferences: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

interface UpdateUserInput {
  name?: string
  email?: string
  currentPassword?: string
  newPassword?: string
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/user/me`)
      if (!response.ok) {
        throw new Error('Failed to fetch user')
      }

      const data = await response.json()
      return data.data as User
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: UpdateUserInput) => {
      const response = await fetch(`${API_BASE}/user/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      const data = await response.json()
      return data.data as User
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] })
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
