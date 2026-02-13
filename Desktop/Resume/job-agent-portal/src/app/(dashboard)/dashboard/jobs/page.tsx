'use client'

import { useState, useMemo, useEffect } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { JobGrid } from '@/components/jobs/job-grid'
import { JobDetail } from '@/components/jobs/job-detail'
import { useJobs, useJob } from '@/hooks/use-jobs'
import { useProfiles } from '@/hooks/use-profiles'
import { useJobStore } from '@/stores/job-store'
import { useCreateApplication } from '@/hooks/use-tracker'
import { Sparkles, Search, X, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Platform } from '@/types/job'

export const dynamic = 'force-dynamic'

type PlatformFilter = 'all' | Platform

const PLATFORMS: { value: PlatformFilter; label: string }[] = [
  { value: 'all', label: 'All Platforms' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'dice', label: 'Dice' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'glassdoor', label: 'Glassdoor' },
  { value: 'ziprecruiter', label: 'ZipRecruiter' },
]

export default function JobsPage() {
  const { filters, setFilters, selectedJobId, setSelectedJobId } = useJobStore()
  const { data: profilesData } = useProfiles()
  const profiles = profilesData || []
  const { toast } = useToast()

  const [mainTab, setMainTab] = useState<'search' | 'results'>('search')
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [activePlatform, setActivePlatform] = useState<PlatformFilter>('all')
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [hasSearched, setHasSearched] = useState(false)

  const createApplication = useCreateApplication()

  // Auto-select active profiles on load
  useEffect(() => {
    if (profiles.length > 0 && selectedProfileIds.size === 0) {
      const activeIds = profiles.filter(p => p.isActive).map(p => p.id)
      if (activeIds.length > 0) {
        setSelectedProfileIds(new Set(activeIds))
      }
    }
  }, [profiles, selectedProfileIds.size])

  // Platform filters for jobs
  const platformFilters = useMemo(() => {
    return {
      ...filters,
      platform: activePlatform === 'all' ? undefined : activePlatform,
    }
  }, [filters, activePlatform])

  const { data: jobsData, isLoading, refetch } = useJobs(platformFilters)
  const { data: selectedJob } = useJob(selectedJobId)

  // Jobs sorted by match score
  const sortedJobs = useMemo(() => {
    const jobs = jobsData?.jobs || []
    return jobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
  }, [jobsData?.jobs])

  // Filter profiles by search query
  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return profiles
    return profiles.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.jobTitles.some(title => title.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [profiles, searchQuery])

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

  // Handle job search
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
      // Trigger job scraping
      const response = await fetch('/api/scrapers/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileIds: Array.from(selectedProfileIds),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to trigger job search')
      }

      const data = await response.json()

      // Refetch jobs after scraping
      await refetch()

      setHasSearched(true)
      setMainTab('results')

      toast({
        title: 'Job search completed',
        description: `Found ${data.data?.totalJobs || 0} jobs across ${selectedProfileIds.size} profile(s)`,
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

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sparkles}
        title="Job Search"
        description="Search for jobs across all platforms with AI-powered matching"
      />

      {/* Main Tabs: Search vs Results */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'search' | 'results')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Profiles
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {selectedProfileIds.size} selected
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Job Results
            {hasSearched && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {jobsData?.total || 0}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile Search & Selection */}
        {mainTab === 'search' && (
          <div className="mt-6 space-y-4">
            {/* Search Input */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Search profiles by name, domain, or job title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button
                  onClick={handleSearchJobs}
                  disabled={isSearching || selectedProfileIds.size === 0}
                  className="min-w-[140px]"
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
            </Card>

            {/* Selected Profiles Summary */}
            {selectedProfileIds.size > 0 && (
              <Card className="p-4 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {selectedProfileIds.size} {selectedProfileIds.size === 1 ? 'profile' : 'profiles'} selected
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProfileIds(new Set())}
                  >
                    Clear All
                  </Button>
                </div>
              </Card>
            )}

            {/* Profile List */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Available Search Profiles</h3>
              {profiles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">
                    No profiles found. Create a profile to start searching for jobs.
                  </p>
                  <Button onClick={() => window.location.href = '/dashboard/profiles'}>
                    Create Profile
                  </Button>
                </div>
              ) : filteredProfiles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No profiles match your search query.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredProfiles.map((profile) => (
                    <Card
                      key={profile.id}
                      className={cn(
                        'p-4 cursor-pointer transition-all hover:shadow-md',
                        selectedProfileIds.has(profile.id) && 'border-primary bg-primary/5'
                      )}
                      onClick={() => toggleProfileSelection(profile.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedProfileIds.has(profile.id)}
                          onCheckedChange={() => toggleProfileSelection(profile.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{profile.name}</h4>
                            {profile.isActive && (
                              <Badge variant="default" className="h-5 text-xs">Active</Badge>
                            )}
                            {selectedProfileIds.has(profile.id) && (
                              <Badge variant="secondary" className="h-5 text-xs">Selected</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Job Titles:</span> {profile.jobTitles.slice(0, 2).join(', ')}
                              {profile.jobTitles.length > 2 && ` +${profile.jobTitles.length - 2} more`}
                            </div>
                            <div>
                              <span className="font-medium">Domain:</span> {profile.domain || 'General'}
                            </div>
                            <div>
                              <span className="font-medium">Locations:</span> {profile.locations.slice(0, 2).join(', ')}
                            </div>
                            <div>
                              <span className="font-medium">Platforms:</span> {profile.platforms.length} platforms
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Tab 2: Job Results */}
        {mainTab === 'results' && (
          <div className="mt-6 space-y-4">
            {!hasSearched ? (
              <Card className="p-8 text-center">
                <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No search performed yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select profiles and click "Search Jobs" to find matching opportunities
                </p>
                <Button onClick={() => setMainTab('search')}>
                  Go to Search
                </Button>
              </Card>
            ) : (
              <>
                {/* Platform Tabs */}
                <Tabs value={activePlatform} onValueChange={(v) => setActivePlatform(v as PlatformFilter)}>
                  <TabsList className="grid w-full grid-cols-6">
                    {PLATFORMS.map((platform) => {
                      const count =
                        platform.value === 'all'
                          ? jobsData?.total || 0
                          : sortedJobs.filter((j) => j.platform === platform.value).length

                      return (
                        <TabsTrigger key={platform.value} value={platform.value} className="flex items-center gap-2">
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
                </Tabs>

                {/* Job Grid */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className={cn('lg:col-span-3', selectedJobId && 'lg:col-span-2')}>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{sortedJobs.length} jobs found</p>
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
                          {Math.min((filters.offset || 0) + (filters.limit || 50), jobsData.total)} of {jobsData.total}
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
                          <Button variant="ghost" size="icon" onClick={() => setSelectedJobId(null)}>
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
              </>
            )}
          </div>
        )}
      </Tabs>
    </div>
  )
}
