'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useOutreachRecords, useDeleteOutreachRecord } from '@/hooks/use-outreach'
import {
  Trash2,
  Copy,
  Download,
  CheckCircle2,
  Linkedin,
  Mail,
  FileText,
  Clock,
  Loader2,
} from 'lucide-react'
import { OutreachRecord } from '@/types/outreach'

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString + 'Z')
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function RecordItem({ record }: { record: OutreachRecord }) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const deleteRecord = useDeleteOutreachRecord()

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this outreach record?')) {
      deleteRecord.mutate(record.id)
    }
  }

  const displayTitle = record.company && record.jobTitle
    ? `${record.company} - ${record.jobTitle}`
    : record.company || record.jobTitle || record.jobDescription.slice(0, 80) + '...'

  const toneColors: Record<string, string> = {
    professional: 'bg-blue-100 text-blue-800',
    enthusiastic: 'bg-orange-100 text-orange-800',
    conversational: 'bg-green-100 text-green-800',
  }

  return (
    <AccordionItem value={record.id} className="border rounded-lg px-4 mb-2">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{displayTitle}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={`text-xs ${toneColors[record.tone || 'professional']}`}>
                {record.tone || 'professional'}
              </Badge>
              {record.linkedinMessage && (
                <Badge variant="outline" className="text-xs">
                  <Linkedin className="h-3 w-3 mr-1" />
                  LinkedIn
                </Badge>
              )}
              {record.emailMessage && (
                <Badge variant="outline" className="text-xs">
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </Badge>
              )}
              {(record.resumeUrl || record.coverLetterUrl) && (
                <Badge variant="outline" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Docs
                </Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimeAgo(record.createdAt)}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteRecord.isPending}
          >
            {deleteRecord.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pb-2">
          {/* LinkedIn Message */}
          {record.linkedinMessage && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Linkedin className="h-4 w-4 text-blue-600" />
                  LinkedIn Message
                  <span className="text-xs text-muted-foreground">
                    ({record.linkedinMessage.length}/300)
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(record.linkedinMessage!, 'linkedin')}
                >
                  {copiedField === 'linkedin' ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap">
                {record.linkedinMessage}
              </div>
            </div>
          )}

          {/* Email Message */}
          {record.emailMessage && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-purple-600" />
                  Email Message
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(record.emailMessage!, 'email')}
                >
                  {copiedField === 'email' ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap">
                {record.emailMessage}
              </div>
            </div>
          )}

          {/* Documents */}
          {(record.resumeUrl || record.coverLetterUrl) && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents
              </p>
              <div className="flex gap-2">
                {record.resumeUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={record.resumeUrl} download>
                      <Download className="h-3 w-3 mr-1" />
                      Resume
                    </a>
                  </Button>
                )}
                {record.coverLetterUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={record.coverLetterUrl} download>
                      <Download className="h-3 w-3 mr-1" />
                      Cover Letter
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Prerequisites if any */}
          {record.prerequisites && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Prerequisites:</span> {record.prerequisites}
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export function OutreachHistory() {
  const { data, isLoading } = useOutreachRecords()
  const records = data?.records || []

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading outreach history...
        </div>
      </Card>
    )
  }

  if (records.length === 0) {
    return null
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Outreach History
        </h3>
        <p className="text-sm text-muted-foreground">
          Your previously generated messages and documents ({records.length} records)
        </p>
      </div>
      <Accordion type="single" collapsible className="space-y-0">
        {records.map((record) => (
          <RecordItem key={record.id} record={record} />
        ))}
      </Accordion>
    </Card>
  )
}
