'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SearchProfile, CreateProfileInput, UpdateProfileInput } from '@/types/profile'
import { useToast } from '@/hooks/use-toast'

const API_BASE = '/api'

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/profiles`)
      if (!response.ok) {
        throw new Error('Failed to fetch profiles')
      }

      const data = await response.json()
      return data.data as SearchProfile[]
    },
  })
}

export function useProfile(id: string | null) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      if (!id) return null

      const response = await fetch(`${API_BASE}/profiles/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      return data.data as SearchProfile
    },
    enabled: !!id,
  })
}

export function useCreateProfile() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: CreateProfileInput) => {
      const response = await fetch(`${API_BASE}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error('Failed to create profile')
      }

      const data = await response.json()
      return data.data as SearchProfile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      toast({
        title: 'Profile created',
        description: 'Your search profile has been created successfully',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create profile',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateProfileInput }) => {
      const response = await fetch(`${API_BASE}/profiles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const data = await response.json()
      return data.data as SearchProfile
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] })
      toast({
        title: 'Profile updated',
        description: 'Your search profile has been updated successfully',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteProfile() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/profiles/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete profile')
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      toast({
        title: 'Profile deleted',
        description: 'Your search profile has been deleted',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete profile',
        variant: 'destructive',
      })
    },
  })
}
