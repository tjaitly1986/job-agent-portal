'use client'

import { ResumeCard } from './resume-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText } from 'lucide-react'

interface Resume {
  id: string
  filename: string
  filePath: string
  fileType: string
  fileSize: number
  label: string | null
  isDefault: boolean
  parsedText: string | null
  createdAt: string
}

interface ResumeListProps {
  resumes: Resume[]
  isLoading?: boolean
  onEdit?: (resume: Resume) => void
  onDelete?: (resume: Resume) => void
  onDownload?: (resume: Resume) => void
  onSetDefault?: (resume: Resume) => void
}

export function ResumeList({
  resumes,
  isLoading,
  onEdit,
  onDelete,
  onDownload,
  onSetDefault,
}: ResumeListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (resumes.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No resumes uploaded"
        description="Upload your resume to start applying for jobs"
      />
    )
  }

  return (
    <div className="space-y-4">
      {resumes.map((resume) => (
        <ResumeCard
          key={resume.id}
          resume={resume}
          onEdit={() => onEdit?.(resume)}
          onDelete={() => onDelete?.(resume)}
          onDownload={() => onDownload?.(resume)}
          onSetDefault={() => onSetDefault?.(resume)}
        />
      ))}
    </div>
  )
}
