'use client'

import { Job } from '@/types/job'
import { JobCard } from './job-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Briefcase, AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

interface JobGridProps {
  jobs: Job[]
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  onJobClick?: (job: Job) => void
  onJobSave?: (job: Job) => void
  savedJobIds?: Set<string>
}

export function JobGrid({ jobs, isLoading, isError, onRetry, onJobClick, onJobSave, savedJobIds }: JobGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <h3 className="text-lg font-medium">Failed to load jobs</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Something went wrong while fetching jobs. Please try again.
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No jobs found"
        description="Try adjusting your filters or search criteria"
      />
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onClick={() => onJobClick?.(job)}
          onSave={() => onJobSave?.(job)}
          isSaved={savedJobIds?.has(job.id)}
        />
      ))}
    </div>
  )
}
