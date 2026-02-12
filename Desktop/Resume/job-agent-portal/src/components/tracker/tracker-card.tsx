'use client'

import { JobApplication } from '@/types/tracker'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './status-badge'
import {
  Building2,
  MapPin,
  Calendar,
  FileText,
  ExternalLink,
  Edit,
  Trash2,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface TrackerCardProps {
  application: JobApplication
  onEdit?: () => void
  onDelete?: () => void
  onClick?: () => void
}

export function TrackerCard({ application, onEdit, onDelete, onClick }: TrackerCardProps) {
  const job = application.job

  if (!job) return null

  return (
    <Card
      className="cursor-pointer p-4 transition-all hover:shadow-md"
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold line-clamp-1">{job.title}</h3>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span className="line-clamp-1">{job.company}</span>
            </div>
          </div>
          <StatusBadge status={application.status} />
        </div>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{job.location}</span>
          {job.isRemote && <Badge variant="secondary" className="ml-1 text-xs">Remote</Badge>}
        </div>

        {/* Dates */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {application.appliedAt && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Applied {format(new Date(application.appliedAt), 'MMM dd, yyyy')}</span>
            </div>
          )}
          {application.followUpDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Follow up: {format(new Date(application.followUpDate), 'MMM dd, yyyy')}</span>
            </div>
          )}
        </div>

        {/* Notes Preview */}
        {application.notes && (
          <div className="flex items-start gap-1 text-xs text-muted-foreground">
            <FileText className="h-3 w-3 mt-0.5 shrink-0" />
            <p className="line-clamp-2">{application.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(application.updatedAt), { addSuffix: true })}
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation()
                window.open(job.applyUrl, '_blank')
              }}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
