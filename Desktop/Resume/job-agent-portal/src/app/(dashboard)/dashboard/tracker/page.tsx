'use client'

import { PageHeader } from '@/components/shared/page-header'
import { TrackerKanban } from '@/components/tracker/tracker-kanban'
import { TrackerTable } from '@/components/tracker/tracker-table'
import { useApplications, useDeleteApplication } from '@/hooks/use-tracker'
import { useTrackerStore } from '@/stores/tracker-store'
import { JobApplication } from '@/types/tracker'
import { ClipboardList, LayoutGrid, Table } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default function TrackerPage() {
  const { data: applicationsData, isLoading } = useApplications()
  const deleteApplication = useDeleteApplication()
  const { viewMode, setViewMode } = useTrackerStore()

  const handleEdit = (application: JobApplication) => {
    // TODO: Open edit modal
    console.log('Editing application:', application.id)
  }

  const handleDelete = (application: JobApplication) => {
    if (confirm(`Are you sure you want to remove this application?`)) {
      deleteApplication.mutate(application.id)
    }
  }

  const handleViewDetails = (application: JobApplication) => {
    // TODO: Open detail modal or navigate to detail page
    console.log('Viewing details:', application.id)
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

      {viewMode === 'kanban' ? (
        <TrackerKanban
          applications={applicationsData?.applications || []}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
        />
      ) : (
        <TrackerTable
          applications={applicationsData?.applications || []}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
        />
      )}
    </div>
  )
}
