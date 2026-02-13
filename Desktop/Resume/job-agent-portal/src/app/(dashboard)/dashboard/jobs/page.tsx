'use client'

import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { JobGrid } from '@/components/jobs/job-grid'
import { JobDetail } from '@/components/jobs/job-detail'
import { useJobs, useJob } from '@/hooks/use-jobs'
import { useProfiles } from '@/hooks/use-profiles'
import { useJobStore } from '@/stores/job-store'
import { useCreateApplication } from '@/hooks/use-tracker'
import { Sparkles, X, Plus, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Platform } from '@/types/job'

export const dynamic = 'force-dynamic'

type PlatformFilter = 'all' | Platform

const PLATFORMS: { value: PlatformFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All Platforms', color: 'default' },
  { value: 'indeed', label: 'Indeed', color: 'blue' },
  { value: 'dice', label: 'Dice', color: 'red' },
  { value: 'linkedin', label: 'LinkedIn', color: 'blue' },
  { value: 'glassdoor', label: 'Glassdoor', color: 'green' },
  { value: 'ziprecruiter', label: 'ZipRecruiter', color: 'green' },
]

export default function JobsPage() {
  const { filters, setFilters, selectedJobId, setSelectedJobId } = useJobStore()
  const { data: profilesData } = useProfiles()
  const profiles = profilesData || []

  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [activePlatform, setActivePlatform] = useState<PlatformFilter>('all')
  const [activeProfileIds, setActiveProfileIds] = useState<Set<string>>(
    new Set(profiles.filter(p => p.isActive).map(p => p.id))
  )
  const [showProfileSelector, setShowProfileSelector] = useState(false)

  // Update filters when platform changes
  const platformFilters = useMemo(() => {
    return {
      ...filters,
      platform: activePlatform === 'all' ? undefined : activePlatform,
    }
  }, [filters, activePlatform])

  const { data: jobsData, isLoading } = useJobs(platformFilters)
  const { data: selectedJob } = useJob(selectedJobId)

  const createApplication = useCreateApplication()

  // Jobs sorted by match score
  const sortedJobs = useMemo(() => {
    const jobs = jobsData?.jobs || []
    return jobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
  }, [jobsData?.jobs])

  // Profile toggle handlers
  const toggleProfile = (profileId: string) => {
    const newActive = new Set(activeProfileIds)
    if (newActive.has(profileId)) {
      newActive.delete(profileId)
    } else {
      newActive.add(profileId)
    }
    setActiveProfileIds(newActive)
  }

  const activeProfiles = profiles.filter(p => activeProfileIds.has(p.id))

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
        title="Job Search"
        description="Find jobs across all platforms with AI-powered matching"
      />

      {/* Profile Filter Bar */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Search Profiles:</span>

          {/* Active Profile Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {activeProfiles.length === 0 ? (
              <span className="text-sm text-muted-foreground">No profiles selected</span>
            ) : (
              activeProfiles.map(profile => (
                <Badge
                  key={profile.id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  {profile.name}
                  <button
                    onClick={() => toggleProfile(profile.id)}
                    className="ml-1 rounded-sm hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}

            {/* Add Profile Button */}
            {profiles.filter(p => !activeProfileIds.has(p.id)).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProfileSelector(!showProfileSelector)}
                className="h-7"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Profile
              </Button>
            )}
          </div>
        </div>

        {/* Profile Selector Dropdown */}
        {showProfileSelector && (
          <div className="mt-3 border-t pt-3">
            <div className="flex flex-wrap gap-2">
              {profiles
                .filter(p => !activeProfileIds.has(p.id))
                .map(profile => (
                  <Badge
                    key={profile.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-secondary"
                    onClick={() => {
                      toggleProfile(profile.id)
                      setShowProfileSelector(false)
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {profile.name}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </Card>

      {/* Platform Tabs */}
      <Tabs value={activePlatform} onValueChange={(v) => setActivePlatform(v as PlatformFilter)} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          {PLATFORMS.map(platform => {
            const count = platform.value === 'all'
              ? jobsData?.total || 0
              : sortedJobs.filter(j => j.platform === platform.value).length

            return (
              <TabsTrigger
                key={platform.value}
                value={platform.value}
                className="flex items-center gap-2"
              >
                {platform.label}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Job List */}
          <div className={cn('lg:col-span-3', selectedJobId && 'lg:col-span-2')}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {sortedJobs.length} jobs found
              </p>
            </div>

            <JobGrid
              jobs={sortedJobs}
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
