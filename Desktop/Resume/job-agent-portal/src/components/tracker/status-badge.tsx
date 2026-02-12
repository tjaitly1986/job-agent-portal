import { ApplicationStatus } from '@/types/tracker'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: ApplicationStatus
  className?: string
}

const statusConfig: Record<
  ApplicationStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }
> = {
  saved: {
    label: 'Saved',
    variant: 'secondary',
    color: 'bg-gray-500',
  },
  ready_to_apply: {
    label: 'Ready to Apply',
    variant: 'outline',
    color: 'bg-blue-500',
  },
  applied: {
    label: 'Applied',
    variant: 'default',
    color: 'bg-blue-600',
  },
  phone_screen: {
    label: 'Phone Screen',
    variant: 'default',
    color: 'bg-purple-500',
  },
  interview: {
    label: 'Interview',
    variant: 'default',
    color: 'bg-indigo-500',
  },
  technical: {
    label: 'Technical',
    variant: 'default',
    color: 'bg-violet-500',
  },
  offer: {
    label: 'Offer',
    variant: 'default',
    color: 'bg-green-500',
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    color: 'bg-red-500',
  },
  withdrawn: {
    label: 'Withdrawn',
    variant: 'secondary',
    color: 'bg-orange-500',
  },
  expired: {
    label: 'Expired',
    variant: 'secondary',
    color: 'bg-gray-400',
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  )
}

export function getStatusColor(status: ApplicationStatus): string {
  return statusConfig[status].color
}
