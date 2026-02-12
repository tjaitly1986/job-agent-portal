'use client'

import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { ErrorBoundary } from '@/components/shared/error-boundary'

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <Topbar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
