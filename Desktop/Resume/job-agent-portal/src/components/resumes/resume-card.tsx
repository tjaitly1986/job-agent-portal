'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Star, Edit, Trash2, Download } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

interface ResumeCardProps {
  resume: Resume
  onEdit?: () => void
  onDelete?: () => void
  onDownload?: () => void
  onSetDefault?: () => void
}

export function ResumeCard({ resume, onEdit, onDelete, onDownload, onSetDefault }: ResumeCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileExtension = () => {
    if (resume.fileType === 'application/pdf') return 'PDF'
    if (resume.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return 'DOCX'
    }
    return 'File'
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          {/* File Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>

          {/* Resume Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold line-clamp-1">
                {resume.label || resume.filename}
              </h3>
              {resume.isDefault && (
                <Badge variant="default" className="gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Default
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{resume.filename}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{getFileExtension()}</span>
              <span>•</span>
              <span>{formatFileSize(resume.fileSize)}</span>
              <span>•</span>
              <span>Uploaded {formatDistanceToNow(new Date(resume.createdAt), { addSuffix: true })}</span>
            </div>
            {resume.parsedText && (
              <div className="mt-3 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                <p className="line-clamp-2">{resume.parsedText.substring(0, 200)}...</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          {!resume.isDefault && onSetDefault && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSetDefault}
              title="Set as default"
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          {onDownload && (
            <Button variant="ghost" size="icon" onClick={onDownload}>
              <Download className="h-4 w-4" />
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
