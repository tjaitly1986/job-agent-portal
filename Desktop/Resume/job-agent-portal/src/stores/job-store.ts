import { create } from 'zustand'
import { JobFilterParams } from '@/types/job'

interface JobStore {
  filters: JobFilterParams
  selectedJobId: string | null
  setFilters: (filters: JobFilterParams) => void
  resetFilters: () => void
  setSelectedJobId: (id: string | null) => void
}

const defaultFilters: JobFilterParams = {
  limit: 50,
  offset: 0,
  orderBy: 'posted_at',
  orderDir: 'desc',
}

export const useJobStore = create<JobStore>((set) => ({
  filters: defaultFilters,
  selectedJobId: null,

  setFilters: (filters) => set({ filters }),

  resetFilters: () => set({ filters: defaultFilters }),

  setSelectedJobId: (id) => set({ selectedJobId: id }),
}))
