'use client'

import { JobApplication } from '@/types/tracker'
import { StatusBadge } from './status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, MapPin, Calendar, Edit, Trash2, ExternalLink, ClipboardList } from 'lucide-react'
import { format } from 'date-fns'

interface TrackerTableProps {
  applications: JobApplication[]
  isLoading?: boolean
  onEdit?: (application: JobApplication) => void
  onDelete?: (application: JobApplication) => void
  onViewDetails?: (application: JobApplication) => void
}

export function TrackerTable({
  applications,
  isLoading,
  onEdit,
  onDelete,
  onViewDetails,
}: TrackerTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No applications tracked"
        description="Start tracking job applications to manage your job search"
      />
    )
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-medium">Job</th>
              <th className="p-3 text-left text-sm font-medium">Company</th>
              <th className="p-3 text-left text-sm font-medium">Location</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
              <th className="p-3 text-left text-sm font-medium">Applied</th>
              <th className="p-3 text-left text-sm font-medium">Follow Up</th>
              <th className="p-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => {
              const job = application.job
              if (!job) return null

              return (
                <tr
                  key={application.id}
                  className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onViewDetails?.(application)}
                >
                  <td className="p-3">
                    <div className="max-w-xs">
                      <div className="font-medium line-clamp-1">{job.title}</div>
                      <div className="text-xs text-muted-foreground">{job.platform}</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-sm line-clamp-1">{job.company}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-sm line-clamp-1">{job.location}</span>
                    </div>
                    {job.isRemote && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        Remote
                      </Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={application.status} />
                  </td>
                  <td className="p-3">
                    {application.appliedAt ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{format(new Date(application.appliedAt), 'MMM dd')}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    {application.followUpDate ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{format(new Date(application.followUpDate), 'MMM dd')}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(application)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(application)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(job.applyUrl, '_blank')
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
