'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { JobGrid } from '@/components/jobs/job-grid'
import { JobFilters } from '@/components/jobs/job-filters'
import { JobDetail } from '@/components/jobs/job-detail'
import { useJobs, useJob } from '@/hooks/use-jobs'
import { useJobStore } from '@/stores/job-store'
import { useCreateApplication } from '@/hooks/use-tracker'
import { Briefcase, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function JobsPage() {
  const { filters, setFilters, resetFilters, selectedJobId, setSelectedJobId } = useJobStore()
  const { data: jobsData, isLoading } = useJobs(filters)
  const { data: selectedJob } = useJob(selectedJobId)
  const createApplication = useCreateApplication()

  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())

  const handleJobClick = (job: { id: string }) => {
    setSelectedJobId(job.id)
  }

  const handleJobSave = (job: { id: string }) => {
    const newSaved = new Set(savedJobIds)
    if (newSaved.has(job.id)) {
      newSaved.delete(job.id)
    } else {
      newSaved.add(job.id)
    }
    setSavedJobIds(newSaved)
  }

  const handleTrackApplication = () => {
    if (!selectedJob) return

    createApplication.mutate(
      {
        jobId: selectedJob.id,
        status: 'saved',
        notes: '',
      },
      {
        onSuccess: () => {
          setSelectedJobId(null)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Briefcase}
        title="Job Listings"
        description="Browse and filter job opportunities from multiple platforms"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <JobFilters filters={filters} onChange={setFilters} onReset={resetFilters} />
        </div>

        {/* Job List */}
        <div className={cn('lg:col-span-3', selectedJobId && 'lg:col-span-2')}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {jobsData?.total ? `${jobsData.total} jobs found` : 'Loading...'}
            </p>
          </div>

          <JobGrid
            jobs={jobsData?.jobs || []}
            isLoading={isLoading}
            onJobClick={handleJobClick}
            onJobSave={handleJobSave}
            savedJobIds={savedJobIds}
          />

          {/* Pagination */}
          {jobsData && jobsData.total > jobsData.limit && (
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="outline"
                disabled={filters.offset === 0}
                onClick={() =>
                  setFilters({
                    ...filters,
                    offset: Math.max(0, (filters.offset || 0) - (filters.limit || 50)),
                  })
                }
              >
                Previous
              </Button>
              <p className="text-sm text-muted-foreground">
                Showing {(filters.offset || 0) + 1} -{' '}
                {Math.min((filters.offset || 0) + (filters.limit || 50), jobsData.total)} of{' '}
                {jobsData.total}
              </p>
              <Button
                variant="outline"
                disabled={(filters.offset || 0) + (filters.limit || 50) >= jobsData.total}
                onClick={() =>
                  setFilters({
                    ...filters,
                    offset: (filters.offset || 0) + (filters.limit || 50),
                  })
                }
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Job Detail Sidebar */}
        {selectedJobId && selectedJob && (
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Job Details</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedJobId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <JobDetail
                job={selectedJob}
                onSave={() => handleJobSave(selectedJob)}
                onTrack={handleTrackApplication}
                isSaved={savedJobIds.has(selectedJob.id)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
