'use client'

import { useQuery } from '@tanstack/react-query'
import { Job, JobFilterParams } from '@/types/job'

const API_BASE = '/api'

/** Convert shorthand like "24h", "3d", "7d" to an ISO timestamp */
function postedAfterToISO(value: string): string {
  const map: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '14d': 14 * 24 * 60 * 60 * 1000,
  }
  const ms = map[value]
  if (ms) return new Date(Date.now() - ms).toISOString()
  // Already an ISO string or unknown — pass through
  return value
}

interface JobsResponse {
  jobs: Job[]
  total: number
  limit: number
  offset: number
}

export function useJobs(filters: JobFilterParams) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      const params = new URLSearchParams()

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Skip boolean false for isRemote — undefined means "no filter"
          if (key === 'isRemote' && value === false) return
          // Convert shorthand posted-after values to ISO timestamps
          if (key === 'postedAfter' && typeof value === 'string') {
            params.append(key, postedAfterToISO(value))
            return
          }
          params.append(key, String(value))
        }
      })

      const response = await fetch(`${API_BASE}/jobs?${params}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || `Failed to fetch jobs (${response.status})`)
      }

      const data = await response.json()
      return data.data as JobsResponse
    },
  })
}

export function useJob(id: string | null) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      if (!id) return null

      const response = await fetch(`${API_BASE}/jobs/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch job')
      }

      const data = await response.json()
      return data.data as Job
    },
    enabled: !!id,
  })
}
