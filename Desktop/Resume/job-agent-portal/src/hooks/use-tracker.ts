'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { JobApplication, CreateApplicationInput, UpdateApplicationInput } from '@/types/tracker'
import { useToast } from '@/components/ui/use-toast'

const API_BASE = '/api'

interface ApplicationsResponse {
  applications: JobApplication[]
  total: number
  limit: number
  offset: number
}

export function useApplications(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['applications', filters],
    queryFn: async () => {
      const params = new URLSearchParams()

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
      }

      const response = await fetch(`${API_BASE}/tracker?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch applications')
      }

      const data = await response.json()
      return data.data as ApplicationsResponse
    },
  })
}

export function useApplication(id: string | null) {
  return useQuery({
    queryKey: ['application', id],
    queryFn: async () => {
      if (!id) return null

      const response = await fetch(`${API_BASE}/tracker/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch application')
      }

      const data = await response.json()
      return data.data as JobApplication
    },
    enabled: !!id,
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: CreateApplicationInput) => {
      const response = await fetch(`${API_BASE}/tracker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error('Failed to create application')
      }

      const data = await response.json()
      return data.data as JobApplication
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast({
        title: 'Application tracked',
        description: 'Job application has been added to your tracker',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to track application',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateApplication() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateApplicationInput }) => {
      const response = await fetch(`${API_BASE}/tracker/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error('Failed to update application')
      }

      const data = await response.json()
      return data.data as JobApplication
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['application', data.id] })
      toast({
        title: 'Application updated',
        description: 'Application status has been updated',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update application',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteApplication() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/tracker/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete application')
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast({
        title: 'Application removed',
        description: 'Application has been removed from tracker',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete application',
        variant: 'destructive',
      })
    },
  })
}
