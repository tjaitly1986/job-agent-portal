'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { TrackerKanban } from '@/components/tracker/tracker-kanban'
import { TrackerTable } from '@/components/tracker/tracker-table'
import { TrackerDetailDialog } from '@/components/tracker/tracker-detail-dialog'
import { useApplications, useUpdateApplication, useDeleteApplication } from '@/hooks/use-tracker'
import { useTrackerStore } from '@/stores/tracker-store'
import { JobApplication, ApplicationStatus } from '@/types/tracker'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, LayoutGrid, Table } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default function TrackerPage() {
  const { data: applicationsData, isLoading } = useApplications()
  const updateApplication = useUpdateApplication()
  const deleteApplication = useDeleteApplication()
  const { viewMode, setViewMode } = useTrackerStore()

  const [detailApp, setDetailApp] = useState<JobApplication | null>(null)

  const applications = applicationsData?.applications || []

  const handleEdit = (application: JobApplication) => {
    setDetailApp(application)
  }

  const handleDelete = (application: JobApplication) => {
    if (confirm(`Are you sure you want to remove this application?`)) {
      deleteApplication.mutate(application.id)
    }
  }

  const handleViewDetails = (application: JobApplication) => {
    setDetailApp(application)
  }

  const handleStatusChange = (application: JobApplication, newStatus: ApplicationStatus) => {
    updateApplication.mutate({
      id: application.id,
      input: { status: newStatus },
    })
  }

  const handleDetailSave = (id: string, input: Parameters<typeof updateApplication.mutate>[0]['input']) => {
    updateApplication.mutate({ id, input }, {
      onSuccess: () => setDetailApp(null),
    })
  }

  // Compute stats
  const statCounts = {
    total: applications.length,
    saved: applications.filter((a) => a.status === 'saved' || a.status === 'ready_to_apply').length,
    applied: applications.filter((a) => a.status === 'applied').length,
    interviewing: applications.filter((a) =>
      ['phone_screen', 'interview', 'technical'].includes(a.status)
    ).length,
    offer: applications.filter((a) => a.status === 'offer').length,
    closed: applications.filter((a) =>
      ['rejected', 'withdrawn', 'expired'].includes(a.status)
    ).length,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Application Tracker"
        description="Manage and track your job applications through the entire process"
        action={
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <Table className="mr-2 h-4 w-4" />
              Table
            </Button>
          </div>
        }
      />

      {/* Summary Stats Bar */}
      {applications.length > 0 && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{statCounts.total} total</span>
            <Badge variant="secondary">{statCounts.saved} saved</Badge>
            <Badge variant="default">{statCounts.applied} applied</Badge>
            <Badge className="bg-indigo-600">{statCounts.interviewing} interviewing</Badge>
            <Badge className="bg-green-600">{statCounts.offer} offers</Badge>
            <Badge variant="destructive">{statCounts.closed} closed</Badge>
          </div>
        </Card>
      )}

      {viewMode === 'kanban' ? (
        <TrackerKanban
          applications={applications}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <TrackerTable
          applications={applications}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Detail / Edit Dialog */}
      <TrackerDetailDialog
        application={detailApp}
        open={!!detailApp}
        onOpenChange={(open) => { if (!open) setDetailApp(null) }}
        onSave={handleDetailSave}
        isLoading={updateApplication.isPending}
      />
    </div>
  )
}
