'use client'

import { Job } from '@/types/job'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, MapPin, DollarSign, Clock, ExternalLink, Bookmark } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface JobCardProps {
  job: Job
  onClick?: () => void
  onSave?: () => void
  isSaved?: boolean
}

export function JobCard({ job, onClick, onSave, isSaved }: JobCardProps) {
  const formatSalary = () => {
    if (!job.salaryMin && !job.salaryMax) return null

    const formatAmount = (amount: number) => {
      if (job.salaryType === 'hourly') {
        return `$${amount}/hr`
      }
      return `$${(amount / 1000).toFixed(0)}k/yr`
    }

    if (job.salaryMin && job.salaryMax) {
      return `${formatAmount(job.salaryMin)} - ${formatAmount(job.salaryMax)}`
    }
    if (job.salaryMin) {
      return `From ${formatAmount(job.salaryMin)}`
    }
    if (job.salaryMax) {
      return `Up to ${formatAmount(job.salaryMax)}`
    }
  }

  const salary = formatSalary()

  return (
    <Card
      className={cn(
        'group cursor-pointer p-6 transition-all hover:shadow-md',
        onClick && 'hover:border-primary'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="text-lg font-semibold line-clamp-1 group-hover:text-primary">
                {job.title}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="line-clamp-1">{job.company}</span>
              </div>
            </div>
            {onSave && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onSave()
                }}
                className={cn('shrink-0', isSaved && 'text-primary')}
              >
                <Bookmark className={cn('h-5 w-5', isSaved && 'fill-current')} />
              </Button>
            )}
          </div>

          {/* Location & Remote */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{job.location}</span>
            </div>
            {job.isRemote && (
              <Badge variant="secondary" className="text-xs">
                Remote
              </Badge>
            )}
          </div>

          {/* Salary & Type */}
          <div className="flex flex-wrap items-center gap-3">
            {salary && (
              <div className="flex items-center gap-1 text-sm font-medium text-primary">
                <DollarSign className="h-4 w-4" />
                <span>{salary}</span>
              </div>
            )}
            {job.employmentType && (
              <Badge variant="outline" className="text-xs">
                {job.employmentType.toUpperCase()}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {job.platform}
            </Badge>
          </div>

          {/* Description Preview */}
          {job.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Posted {formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            window.open(job.applyUrl, '_blank')
          }}
        >
          <ExternalLink className="mr-1 h-4 w-4" />
          Apply
        </Button>
      </div>
    </Card>
  )
}
