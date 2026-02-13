'use client'

import { Job } from '@/types/job'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Building2,
  MapPin,
  DollarSign,
  Clock,
  ExternalLink,
  Bookmark,
  Calendar,
  Tag,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'

interface JobDetailProps {
  job: Job
  onSave?: () => void
  onTrack?: () => void
  isSaved?: boolean
  isTracked?: boolean
}

export function JobDetail({ job, onSave, onTrack, isSaved, isTracked }: JobDetailProps) {
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
    return null
  }

  const salary = formatSalary()

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <div className="mt-2 flex items-center gap-2 text-lg text-muted-foreground">
              <Building2 className="h-5 w-5" />
              <span>{job.company}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {onSave && (
              <Button
                variant={isSaved ? 'default' : 'outline'}
                size="icon"
                onClick={onSave}
              >
                <Bookmark className={cn('h-5 w-5', isSaved && 'fill-current')} />
              </Button>
            )}
            <Button onClick={() => window.open(job.applyUrl, '_blank')}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Apply Now
            </Button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{job.location}</span>
          </div>
          {job.isRemote && (
            <Badge variant="secondary">Remote</Badge>
          )}
          {salary && (
            <div className="flex items-center gap-1 font-medium text-primary">
              <DollarSign className="h-4 w-4" />
              <span>{salary}</span>
            </div>
          )}
          {job.employmentType && (
            <Badge variant="outline">{job.employmentType.toUpperCase()}</Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Posted {formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(job.postedAt), 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Tag className="h-3 w-3" />
            <span>{job.platform}</span>
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Track Button */}
      {onTrack && (
        <>
          <div className="mb-6">
            <Button
              variant={isTracked ? 'outline' : 'default'}
              onClick={onTrack}
              className="w-full"
            >
              {isTracked ? 'Already Tracked' : 'Add to Application Tracker'}
            </Button>
          </div>
          <Separator className="my-6" />
        </>
      )}

      {/* Description */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Job Description</h2>
        {job.descriptionHtml ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: job.descriptionHtml }}
          />
        ) : job.description ? (
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            {job.description}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No description available. Visit the job posting for more details.
          </p>
        )}
      </div>

      {/* Requirements */}
      {job.requirements && (
        <>
          <Separator className="my-6" />
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Requirements</h2>
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">
              {job.requirements}
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <Separator className="my-6" />
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Job ID: {job.externalId || job.id}
        </div>
        <Button variant="outline" onClick={() => window.open(job.sourceUrl || job.applyUrl, '_blank')}>
          View Original Posting
        </Button>
      </div>
    </Card>
  )
}
