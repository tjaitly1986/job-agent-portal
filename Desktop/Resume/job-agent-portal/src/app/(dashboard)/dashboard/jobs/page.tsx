'use client'

import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { JobGrid } from '@/components/jobs/job-grid'
import { JobDetail } from '@/components/jobs/job-detail'
import { useJobs, useJob } from '@/hooks/use-jobs'
import { useJobStore } from '@/stores/job-store'
import { useCreateApplication } from '@/hooks/use-tracker'
import { Sparkles, Zap, Clock, List, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type SmartView = 'top-matches' | 'urgent' | 'recent' | 'all'

export default function JobsPage() {
  const { filters, setFilters, selectedJobId, setSelectedJobId } = useJobStore()
  const { data: jobsData, isLoading } = useJobs(filters)
  const { data: selectedJob } = useJob(selectedJobId)
  const createApplication = useCreateApplication()

  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [activeView, setActiveView] = useState<SmartView>('top-matches')

  // Smart view filters
  const filteredJobs = useMemo(() => {
    const jobs = jobsData?.jobs || []
    const now = new Date()

    switch (activeView) {
      case 'top-matches':
        // Jobs with match score >= 70%, sorted by score
        return jobs
          .filter(job => (job.matchScore || 0) >= 70)
          .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))

      case 'urgent':
        // Jobs posted in last 6 hours with decent match (>60%)
        return jobs
          .filter(job => {
            const postedDate = new Date(job.postedAt)
            const hoursAgo = (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60)
            return hoursAgo < 6 && (job.matchScore || 0) >= 60
          })
          .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())

      case 'recent':
        // All jobs posted in last 24 hours
        return jobs
          .filter(job => {
            const postedDate = new Date(job.postedAt)
            const hoursAgo = (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60)
            return hoursAgo < 24
          })
          .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())

      case 'all':
        // All jobs, sorted by match score
        return jobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))

      default:
        return jobs
    }
  }, [jobsData?.jobs, activeView])

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
        icon={Sparkles}
        title="Smart Job Matches"
        description="AI-powered job recommendations tailored to your profile"
      />

      {/* Smart Views */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as SmartView)} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="top-matches" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Top Matches
            {filteredJobs.filter(j => (j.matchScore || 0) >= 85).length > 0 && (
              <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs">
                {filteredJobs.filter(j => (j.matchScore || 0) >= 85).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="urgent" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Urgent
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            All Jobs
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Job List */}
          <div className={cn('lg:col-span-3', selectedJobId && 'lg:col-span-2')}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredJobs.length} {activeView === 'top-matches' ? 'high-match' : activeView} jobs
              </p>
            </div>

            <JobGrid
              jobs={filteredJobs}
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
      </Tabs>
    </div>
  )
}
