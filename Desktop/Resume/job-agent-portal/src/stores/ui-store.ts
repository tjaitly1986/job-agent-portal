import { create } from 'zustand'

interface UIStore {
  sidebarCollapsed: boolean
  isMobile: boolean
  activeModal: string | null
  modalData: unknown

  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setIsMobile: (isMobile: boolean) => void
  openModal: (modal: string, data?: unknown) => void
  closeModal: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  isMobile: false,
  activeModal: null,
  modalData: null,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  setIsMobile: (isMobile) => set({ isMobile }),

  openModal: (modal, data) => set({ activeModal: modal, modalData: data }),

  closeModal: () => set({ activeModal: null, modalData: null }),
}))
