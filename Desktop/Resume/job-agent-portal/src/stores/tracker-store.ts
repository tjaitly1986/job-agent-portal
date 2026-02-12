import { create } from 'zustand'
import { ApplicationStatus } from '@/types/tracker'

type ViewMode = 'kanban' | 'table'

interface TrackerStore {
  viewMode: ViewMode
  statusFilter: ApplicationStatus | null
  selectedApplicationId: string | null

  setViewMode: (mode: ViewMode) => void
  setStatusFilter: (status: ApplicationStatus | null) => void
  setSelectedApplicationId: (id: string | null) => void
}

export const useTrackerStore = create<TrackerStore>((set) => ({
  viewMode: 'kanban',
  statusFilter: null,
  selectedApplicationId: null,

  setViewMode: (mode) => set({ viewMode: mode }),

  setStatusFilter: (status) => set({ statusFilter: status }),

  setSelectedApplicationId: (id) => set({ selectedApplicationId: id }),
}))
