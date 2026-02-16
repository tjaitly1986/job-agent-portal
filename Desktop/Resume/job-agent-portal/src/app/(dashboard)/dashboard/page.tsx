'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/tracker/status-badge'
import { useApplications } from '@/hooks/use-tracker'
import { useProfiles } from '@/hooks/use-profiles'
import { useJobs } from '@/hooks/use-jobs'
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  UserCircle,
  Search,
  Mail,
  FileText,
  Upload,
  ArrowRight,
} from 'lucide-react'

export default function DashboardPage() {
  const { data: appData, isLoading: appsLoading } = useApplications()
  const { data: profiles, isLoading: profilesLoading } = useProfiles()
  const { data: jobsData, isLoading: jobsLoading } = useJobs({
    limit: 1,
    offset: 0,
    orderBy: 'posted_at',
    orderDir: 'desc',
  })

  const applications = appData?.applications || []
  const totalJobs = jobsData?.total || 0
  const totalApps = appData?.total || 0
  const interviewCount = applications.filter(
    (a) => a.status === 'phone_screen' || a.status === 'interview' || a.status === 'technical'
  ).length
  const activeProfiles = profiles?.filter((p) => p.isActive) || []
  const recentApps = applications.slice(0, 5)

  const stats = [
    { label: 'Total Jobs', value: totalJobs, icon: Briefcase, color: 'text-blue-600' },
    { label: 'Applications', value: totalApps, icon: ClipboardList, color: 'text-green-600' },
    { label: 'Interviews', value: interviewCount, icon: UserCircle, color: 'text-purple-600' },
    { label: 'Active Profiles', value: activeProfiles.length, icon: Search, color: 'text-orange-600' },
  ]

  const quickActions = [
    { label: 'Search Jobs', href: '/dashboard/jobs', icon: Search, description: 'Find matching jobs from all platforms' },
    { label: 'Create Profile', href: '/dashboard/profiles', icon: UserCircle, description: 'Set up job search criteria' },
    { label: 'Generate Outreach', href: '/dashboard/outreach', icon: Mail, description: 'AI-powered recruiter messages' },
    { label: 'Upload Resume', href: '/dashboard/resumes', icon: Upload, description: 'Manage your resume files' },
  ]

  const isLoading = appsLoading || profilesLoading || jobsLoading

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Your job search at a glance"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-3xl font-bold">{stat.value}</p>
                )}
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Applications */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Applications</h3>
            <Link href="/dashboard/tracker">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : recentApps.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                No applications yet. Start by searching for jobs!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {app.job?.title || 'Unknown Position'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {app.job?.company || 'Unknown Company'}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href}>
                  <Button
                    variant="outline"
                    className="w-full h-auto p-4 flex flex-col items-start gap-1 text-left"
                  >
                    <action.icon className="h-5 w-5 text-primary mb-1" />
                    <span className="font-medium text-sm">{action.label}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {action.description}
                    </span>
                  </Button>
                </Link>
              ))}
            </div>
          </Card>

          {/* Active Profiles */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Active Profiles</h3>
              <Link href="/dashboard/profiles">
                <Button variant="ghost" size="sm">
                  Manage <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : activeProfiles.length === 0 ? (
              <div className="text-center py-8">
                <UserCircle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No active profiles. Create one to start searching.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{profile.name}</span>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {profile.jobTitles.length} titles
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
