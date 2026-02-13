'use client'

import { JobApplication, ApplicationStatus } from '@/types/tracker'
import { TrackerCard } from './tracker-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ClipboardList } from 'lucide-react'
import { getStatusColor } from './status-badge'

interface TrackerKanbanProps {
  applications: JobApplication[]
  isLoading?: boolean
  onEdit?: (application: JobApplication) => void
  onDelete?: (application: JobApplication) => void
  onViewDetails?: (application: JobApplication) => void
  onStatusChange?: (application: JobApplication, newStatus: ApplicationStatus) => void
}

const statusColumns: { status: ApplicationStatus; label: string }[] = [
  { status: 'saved', label: 'Saved' },
  { status: 'ready_to_apply', label: 'Ready' },
  { status: 'applied', label: 'Applied' },
  { status: 'phone_screen', label: 'Phone' },
  { status: 'interview', label: 'Interview' },
  { status: 'technical', label: 'Technical' },
  { status: 'offer', label: 'Offer' },
  { status: 'rejected', label: 'Rejected' },
]

export function TrackerKanban({
  applications,
  isLoading,
  onEdit,
  onDelete,
  onViewDetails,
  onStatusChange: _onStatusChange,
}: TrackerKanbanProps) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColumns.map((column) => (
          <div key={column.status} className="flex-shrink-0 w-80">
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

  // Group applications by status
  const groupedApplications = applications.reduce(
    (acc, app) => {
      if (!acc[app.status]) {
        acc[app.status] = []
      }
      acc[app.status].push(app)
      return acc
    },
    {} as Record<ApplicationStatus, JobApplication[]>
  )

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statusColumns.map((column) => {
        const columnApplications = groupedApplications[column.status] || []
        const count = columnApplications.length

        return (
          <div
            key={column.status}
            className="flex-shrink-0 w-80"
          >
            {/* Column Header */}
            <div className="mb-3 flex items-center justify-between rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${getStatusColor(column.status)}`}
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
