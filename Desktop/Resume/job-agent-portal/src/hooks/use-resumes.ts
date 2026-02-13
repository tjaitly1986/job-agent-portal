'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

const API_BASE = '/api'

interface Resume {
  id: string
  filename: string
  filePath: string
  fileType: string
  fileSize: number
  label: string | null
  isDefault: boolean
  parsedText: string | null
  createdAt: string
  updatedAt: string
}

export function useResumes() {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/resumes`)
      if (!response.ok) {
        throw new Error('Failed to fetch resumes')
      }

      const data = await response.json()
      return data.data as Resume[]
    },
  })
}

export function useResume(id: string | null) {
  return useQuery({
    queryKey: ['resume', id],
    queryFn: async () => {
      if (!id) return null

      const response = await fetch(`${API_BASE}/resumes/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch resume')
      }

      const data = await response.json()
      return data.data as Resume
    },
    enabled: !!id,
  })
}

export function useUploadResume() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ file, label, isDefault }: { file: File; label?: string; isDefault?: boolean }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (label) formData.append('label', label)
      if (isDefault) formData.append('isDefault', 'true')

      const response = await fetch(`${API_BASE}/resumes`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload resume')
      }

      const data = await response.json()
      return data.data as Resume
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      toast({
        title: 'Resume uploaded',
        description: 'Your resume has been uploaded successfully',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to upload resume',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateResume() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, label, isDefault }: { id: string; label?: string; isDefault?: boolean }) => {
      const response = await fetch(`${API_BASE}/resumes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, isDefault }),
      })

      if (!response.ok) {
        throw new Error('Failed to update resume')
      }

      const data = await response.json()
      return data.data as Resume
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      queryClient.invalidateQueries({ queryKey: ['resume', data.id] })
      toast({
        title: 'Resume updated',
        description: 'Resume has been updated successfully',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update resume',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteResume() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/resumes/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete resume')
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      toast({
        title: 'Resume deleted',
        description: 'Resume has been deleted',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete resume',
        variant: 'destructive',
      })
    },
  })
}
