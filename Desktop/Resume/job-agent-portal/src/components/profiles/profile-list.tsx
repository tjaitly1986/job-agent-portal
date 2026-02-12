'use client'

import { SearchProfile } from '@/types/profile'
import { ProfileCard } from './profile-card'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { UserCircle } from 'lucide-react'

interface ProfileListProps {
  profiles: SearchProfile[]
  isLoading?: boolean
  onEdit?: (profile: SearchProfile) => void
  onDelete?: (profile: SearchProfile) => void
  onToggleActive?: (profile: SearchProfile) => void
  onTriggerSearch?: (profile: SearchProfile) => void
}

export function ProfileList({
  profiles,
  isLoading,
  onEdit,
  onDelete,
  onToggleActive,
  onTriggerSearch,
}: ProfileListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <EmptyState
        icon={UserCircle}
        title="No search profiles yet"
        description="Create a search profile to get started with automated job searches"
      />
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
      {profiles.map((profile) => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          onEdit={() => onEdit?.(profile)}
          onDelete={() => onDelete?.(profile)}
          onToggleActive={() => onToggleActive?.(profile)}
          onTriggerSearch={() => onTriggerSearch?.(profile)}
        />
      ))}
    </div>
  )
}
