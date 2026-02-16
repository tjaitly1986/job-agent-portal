'use client'

import { useState, useEffect } from 'react'
import { JobApplication, ApplicationStatus, UpdateApplicationInput } from '@/types/tracker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, MapPin, ExternalLink } from 'lucide-react'

interface TrackerDetailDialogProps {
  application: JobApplication | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, input: UpdateApplicationInput) => void
  isLoading?: boolean
}

const allStatuses: { value: ApplicationStatus; label: string }[] = [
  { value: 'saved', label: 'Saved' },
  { value: 'ready_to_apply', label: 'Ready to Apply' },
  { value: 'applied', label: 'Applied' },
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'interview', label: 'Interview' },
  { value: 'technical', label: 'Technical' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'expired', label: 'Expired' },
]

export function TrackerDetailDialog({
  application,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: TrackerDetailDialogProps) {
  const [status, setStatus] = useState<ApplicationStatus>('saved')
  const [appliedAt, setAppliedAt] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (application) {
      setStatus(application.status)
      setAppliedAt(application.appliedAt?.split('T')[0] || '')
      setFollowUpDate(application.followUpDate?.split('T')[0] || '')
      setNotes(application.notes || '')
    }
  }, [application])

  if (!application) return null

  const job = application.job

  const handleSave = () => {
    onSave(application.id, {
      status,
      appliedAt: appliedAt || undefined,
      followUpDate: followUpDate || undefined,
      notes: notes || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="line-clamp-1">{job?.title || 'Application Details'}</DialogTitle>
          <DialogDescription>
            {job && (
              <span className="flex items-center gap-2 mt-1">
                <Building2 className="h-3.5 w-3.5" />
                {job.company}
                <span className="text-muted-foreground">|</span>
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
                {job.isRemote && <Badge variant="secondary" className="text-xs">Remote</Badge>}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(val) => setStatus(val as ApplicationStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appliedAt">Applied Date</Label>
              <Input
                id="appliedAt"
                type="date"
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followUpDate">Follow Up Date</Label>
              <Input
                id="followUpDate"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this application..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {job?.applyUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(job.applyUrl, '_blank')}
              >
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                View Posting
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
