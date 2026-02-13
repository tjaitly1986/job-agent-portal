'use client'

import { Job } from '@/types/job'
import { JobCard } from './job-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Briefcase } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface JobGridProps {
  jobs: Job[]
  isLoading?: boolean
  onJobClick?: (job: Job) => void
  onJobSave?: (job: Job) => void
  savedJobIds?: Set<string>
}

export function JobGrid({ jobs, isLoading, onJobClick, onJobSave, savedJobIds }: JobGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
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
    <div className="space-y-4">
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
