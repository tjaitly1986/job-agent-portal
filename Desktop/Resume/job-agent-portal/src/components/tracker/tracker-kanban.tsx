'use client'

import { JobApplication, ApplicationStatus } from '@/types/tracker'
import { TrackerCard } from './tracker-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ClipboardList } from 'lucide-react'

interface TrackerKanbanProps {
  applications: JobApplication[]
  isLoading?: boolean
  onEdit?: (application: JobApplication) => void
  onDelete?: (application: JobApplication) => void
  onViewDetails?: (application: JobApplication) => void
  onStatusChange?: (application: JobApplication, newStatus: ApplicationStatus) => void
}

// Merged columns: phone_screen/interview/technical → Interviewing, rejected/withdrawn/expired → Closed
type KanbanColumn = 'saved' | 'applied' | 'interviewing' | 'offer' | 'closed'

const kanbanColumns: { id: KanbanColumn; label: string; statuses: ApplicationStatus[] }[] = [
  { id: 'saved', label: 'Saved', statuses: ['saved', 'ready_to_apply'] },
  { id: 'applied', label: 'Applied', statuses: ['applied'] },
  { id: 'interviewing', label: 'Interviewing', statuses: ['phone_screen', 'interview', 'technical'] },
  { id: 'offer', label: 'Offer', statuses: ['offer'] },
  { id: 'closed', label: 'Closed', statuses: ['rejected', 'withdrawn', 'expired'] },
]

const columnColors: Record<KanbanColumn, string> = {
  saved: 'bg-gray-500',
  applied: 'bg-blue-600',
  interviewing: 'bg-indigo-500',
  offer: 'bg-green-500',
  closed: 'bg-red-500',
}

export function TrackerKanban({
  applications,
  isLoading,
  onEdit,
  onDelete,
  onViewDetails,
  onStatusChange,
}: TrackerKanbanProps) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanColumns.map((column) => (
          <div key={column.id} className="flex-1 min-w-[240px]">
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No applications tracked"
        description="Start tracking job applications to see them in the Kanban board"
      />
    )
  }

  // Group applications by kanban column
  const groupedApplications: Record<KanbanColumn, JobApplication[]> = {
    saved: [],
    applied: [],
    interviewing: [],
    offer: [],
    closed: [],
  }

  applications.forEach((app) => {
    const column = kanbanColumns.find((col) => col.statuses.includes(app.status))
    if (column) {
      groupedApplications[column.id].push(app)
    }
  })

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {kanbanColumns.map((column) => {
        const columnApplications = groupedApplications[column.id]
        const count = columnApplications.length

        return (
          <div
            key={column.id}
            className="flex-1 min-w-[240px]"
          >
            {/* Column Header */}
            <div className="mb-3 flex items-center justify-between rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${columnColors[column.id]}`}
                />
                <h3 className="font-semibold">{column.label}</h3>
              </div>
              <Badge variant="secondary" className="text-xs">
                {count}
              </Badge>
            </div>

            {/* Column Body */}
            <div className="space-y-3">
              {columnApplications.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">No applications</p>
                </div>
              ) : (
                columnApplications.map((application) => (
                  <TrackerCard
                    key={application.id}
                    application={application}
                    onEdit={() => onEdit?.(application)}
                    onDelete={() => onDelete?.(application)}
                    onClick={() => onViewDetails?.(application)}
                    onStatusChange={onStatusChange ? (newStatus) => onStatusChange(application, newStatus) : undefined}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
