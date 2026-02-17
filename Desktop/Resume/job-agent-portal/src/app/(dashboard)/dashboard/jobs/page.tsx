'use client'

import { useState, useMemo, useEffect } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { JobGrid } from '@/components/jobs/job-grid'
import { JobDetail } from '@/components/jobs/job-detail'
import { JobFilters } from '@/components/jobs/job-filters'
import { useJobs, useJob } from '@/hooks/use-jobs'
import { useProfiles } from '@/hooks/use-profiles'
import { useJobStore, SortOption } from '@/stores/job-store'
import { useCreateApplication } from '@/hooks/use-tracker'
import {
  Sparkles,
  Search,
  Loader2,
  CheckCircle2,
  ArrowUpDown,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'match', label: 'Best Match', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { value: 'date', label: 'Newest First', icon: <Calendar className="h-3.5 w-3.5" /> },
  { value: 'salary', label: 'Highest Salary', icon: <DollarSign className="h-3.5 w-3.5" /> },
]

export default function JobsPage() {
  const { filters, setFilters, resetFilters, selectedJobId, setSelectedJobId, sortBy, setSortBy } =
    useJobStore()
  const { data: profilesData } = useProfiles()
  const profiles = profilesData || []
  const { toast } = useToast()

  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())

  const createApplication = useCreateApplication()

  // Auto-select active profiles on load
  useEffect(() => {
    if (profiles.length > 0 && selectedProfileIds.size === 0) {
      const activeIds = profiles.filter((p) => p.isActive).map((p) => p.id)
      if (activeIds.length > 0) {
        setSelectedProfileIds(new Set(activeIds))
      }
    }
  }, [profiles, selectedProfileIds.size])

  const { data: jobsData, isLoading, isError, refetch } = useJobs(filters)
  const { data: selectedJob } = useJob(selectedJobId)

  // Sort jobs based on selected sort option
  const sortedJobs = useMemo(() => {
    const jobs = jobsData?.jobs || []
    return [...jobs].sort((a, b) => {
      switch (sortBy) {
        case 'match':
          return (b.matchScore || 0) - (a.matchScore || 0)
        case 'date':
          return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
        case 'salary':
          return (b.salaryMax || b.salaryMin || 0) - (a.salaryMax || a.salaryMin || 0)
        default:
          return 0
      }
    })
  }, [jobsData?.jobs, sortBy])

  // Toggle profile selection
  const toggleProfileSelection = (profileId: string) => {
    const newSelected = new Set(selectedProfileIds)
    if (newSelected.has(profileId)) {
      newSelected.delete(profileId)
    } else {
      newSelected.add(profileId)
    }
    setSelectedProfileIds(newSelected)
  }

  // Handle job search — build proper scraper request from profiles
  const handleSearchJobs = async () => {
    if (selectedProfileIds.size === 0) {
      toast({
        title: 'No profiles selected',
        description: 'Please select at least one profile to search for jobs',
        variant: 'destructive',
      })
      return
    }

    setIsSearching(true)
    try {
      const selectedProfiles = profiles.filter((p) => selectedProfileIds.has(p.id))
      let totalJobs = 0

      for (const profile of selectedProfiles) {
        const searchQuery = profile.jobTitles.join(' OR ')
        const response = await fetch('/api/scrapers/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchQuery,
            location: profile.locations[0] || 'United States',
            platforms: profile.platforms,
            employmentTypes: profile.employmentTypes || ['contract', 'c2c'],
            remote: profile.isRemote ?? true,
            maxResults: 100,
            postedWithin: '24h',
          }),
        })

        if (response.ok) {
          const data = await response.json()
          totalJobs += data.data?.totalFound || 0
        }
      }

      await refetch()

      toast({
        title: 'Job search completed',
        description: `Found ${totalJobs} jobs across ${selectedProfiles.length} profile(s)`,
      })
    } catch (error) {
      toast({
        title: 'Search failed',
        description: 'Failed to search for jobs. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Job interaction handlers
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

  // Pagination helpers
  const totalPages = jobsData ? Math.ceil(jobsData.total / (filters.limit || 50)) : 0
  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1

  const goToPage = (page: number) => {
    setFilters({
      ...filters,
      offset: (page - 1) * (filters.limit || 50),
    })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Sparkles}
        title="Job Search"
        description="Search for jobs across all platforms with AI-powered matching"
      />

      {/* Always-Visible Search Section */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Select profiles to search</p>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {selectedProfileIds.size} selected
            </span>
          </div>
        </div>

        {profiles.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground mb-2">
              No profiles found. Create a profile to start searching.
            </p>
            <Button
              size="sm"
              onClick={() => (window.location.href = '/dashboard/profiles')}
            >
              Create Profile
            </Button>
          </div>
        ) : (
          <>
            {/* Profile Pills */}
            <div className="flex flex-wrap gap-2">
              {profiles.map((profile) => (
                <Badge
                  key={profile.id}
                  variant={selectedProfileIds.has(profile.id) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer text-sm py-1.5 px-3 transition-colors',
                    selectedProfileIds.has(profile.id)
                      ? 'hover:bg-primary/80'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => toggleProfileSelection(profile.id)}
                >
                  {profile.name}
                  {profile.isActive && !selectedProfileIds.has(profile.id) && (
                    <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                  )}
                </Badge>
              ))}
            </div>

            {/* Search Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSearchJobs}
                disabled={isSearching || selectedProfileIds.size === 0}
                size="sm"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search Jobs
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Inline Filter Bar + Sort + Count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <JobFilters filters={filters} onChange={setFilters} onReset={resetFilters} />

        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            {sortedJobs.length} jobs
            {jobsData && jobsData.total > sortedJobs.length && ` of ${jobsData.total}`}
          </p>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[150px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 2-Column Job Grid */}
      <JobGrid
        jobs={sortedJobs}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onJobClick={handleJobClick}
        onJobSave={handleJobSave}
        savedJobIds={savedJobIds}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            Previous
          </Button>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let page: number
            if (totalPages <= 7) {
              page = i + 1
            } else if (currentPage <= 4) {
              page = i + 1
            } else if (currentPage >= totalPages - 3) {
              page = totalPages - 6 + i
            } else {
              page = currentPage - 3 + i
            }

            return (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => goToPage(page)}
              >
                {page}
              </Button>
            )
          })}

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Job Detail Dialog */}
      <Dialog
        open={!!selectedJobId && !!selectedJob}
        onOpenChange={(open) => { if (!open) setSelectedJobId(null) }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Job Details</DialogTitle>
            <DialogDescription className="sr-only">
              Detailed view of the selected job posting
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <JobDetail
              job={selectedJob}
              onSave={() => handleJobSave(selectedJob)}
              onTrack={handleTrackApplication}
              isSaved={savedJobIds.has(selectedJob.id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
