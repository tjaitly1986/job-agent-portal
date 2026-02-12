'use client'

import { PageHeader } from '@/components/shared/page-header'
import { ResumeUpload } from '@/components/resumes/resume-upload'
import { ResumeList } from '@/components/resumes/resume-list'
import { useResumes, useUploadResume, useUpdateResume, useDeleteResume } from '@/hooks/use-resumes'
import { FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ResumesPage() {
  const { data: resumes, isLoading } = useResumes()
  const uploadResume = useUploadResume()
  const updateResume = useUpdateResume()
  const deleteResume = useDeleteResume()

  const handleUpload = async (file: File, label?: string, isDefault?: boolean) => {
    await uploadResume.mutateAsync({ file, label, isDefault })
  }

  const handleEdit = (resume: any) => {
    const newLabel = prompt('Enter new label:', resume.label || resume.filename)
    if (newLabel) {
      updateResume.mutate({ id: resume.id, label: newLabel })
    }
  }

  const handleDelete = (resume: any) => {
    if (confirm(`Are you sure you want to delete "${resume.label || resume.filename}"?`)) {
      deleteResume.mutate(resume.id)
    }
  }

  const handleDownload = (resume: any) => {
    // TODO: Implement download functionality
    window.open(resume.filePath, '_blank')
  }

  const handleSetDefault = (resume: any) => {
    updateResume.mutate({ id: resume.id, isDefault: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Resumes"
        description="Upload and manage your resumes for job applications"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Upload Resume</h2>
          <ResumeUpload onUpload={handleUpload} isUploading={uploadResume.isPending} />
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Your Resumes</h2>
          <ResumeList
            resumes={resumes || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDownload={handleDownload}
            onSetDefault={handleSetDefault}
          />
        </div>
      </div>
    </div>
  )
}
