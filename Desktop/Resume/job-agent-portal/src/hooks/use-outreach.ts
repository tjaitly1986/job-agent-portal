'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { OutreachRecord, CreateOutreachRecordInput, UpdateOutreachRecordInput } from '@/types/outreach'
import { useToast } from '@/hooks/use-toast'

const API_BASE = '/api'

interface OutreachRecordsResponse {
  records: OutreachRecord[]
  total: number
  limit: number
  offset: number
}

export function useOutreachRecords() {
  return useQuery({
    queryKey: ['outreach-records'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/outreach?limit=50&orderDir=desc`)
      if (!response.ok) {
        throw new Error('Failed to fetch outreach records')
      }
      const data = await response.json()
      return data.data as OutreachRecordsResponse
    },
  })
}

export function useCreateOutreachRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateOutreachRecordInput) => {
      const response = await fetch(`${API_BASE}/outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) throw new Error('Failed to save outreach record')
      const data = await response.json()
      return data.data as OutreachRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-records'] })
    },
  })
}

export function useUpdateOutreachRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateOutreachRecordInput }) => {
      const response = await fetch(`${API_BASE}/outreach/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) throw new Error('Failed to update outreach record')
      const data = await response.json()
      return data.data as OutreachRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-records'] })
    },
  })
}

export function useDeleteOutreachRecord() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/outreach/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete outreach record')
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-records'] })
      toast({
        title: 'Record deleted',
        description: 'Outreach record has been removed',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete outreach record',
        variant: 'destructive',
      })
    },
  })
}
