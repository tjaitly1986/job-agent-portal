import { create } from 'zustand'
import { JobFilterParams } from '@/types/job'

export type SortOption = 'match' | 'date' | 'salary'

interface JobStore {
  filters: JobFilterParams
  selectedJobId: string | null
  sortBy: SortOption
  setFilters: (filters: JobFilterParams) => void
  resetFilters: () => void
  setSelectedJobId: (id: string | null) => void
  setSortBy: (sort: SortOption) => void
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
  sortBy: 'match',

  setFilters: (filters) => set({ filters }),

  resetFilters: () => set({ filters: defaultFilters }),

  setSelectedJobId: (id) => set({ selectedJobId: id }),

  setSortBy: (sort) => set({ sortBy: sort }),
}))
