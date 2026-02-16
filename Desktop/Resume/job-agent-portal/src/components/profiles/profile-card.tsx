'use client'

import { SearchProfile } from '@/types/profile'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Edit,
  Trash2,
  Power,
  Search,
  MapPin,
  DollarSign,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface ProfileCardProps {
  profile: SearchProfile
  onEdit?: () => void
  onDelete?: () => void
  onToggleActive?: () => void
  onTriggerSearch?: () => void
}

export function ProfileCard({
  profile,
  onEdit,
  onDelete,
  onToggleActive,
  onTriggerSearch,
}: ProfileCardProps) {
  const formatSalary = () => {
    if (!profile.minSalary && !profile.maxSalary) return null
    if (profile.minSalary && profile.maxSalary) {
      return `$${profile.minSalary}-${profile.maxSalary}/hr`
    }
    if (profile.minSalary) return `From $${profile.minSalary}/hr`
    if (profile.maxSalary) return `Up to $${profile.maxSalary}/hr`
    return null
  }

  const salary = formatSalary()

  // Build a compact summary line
  const summaryParts: string[] = []
  if (profile.locations.length > 0) {
    summaryParts.push(profile.locations.slice(0, 2).join(', '))
    if (profile.locations.length > 2) summaryParts[summaryParts.length - 1] += ` +${profile.locations.length - 2}`
  }
  if (profile.isRemote) summaryParts.push('Remote')
  if (profile.employmentTypes.length > 0) {
    summaryParts.push(profile.employmentTypes.map((t) => t.replace('-', ' ')).join(', '))
  }

  return (
    <Card className={cn('p-5', !profile.isActive && 'opacity-60')}>
      {/* Header: Name + Status + Actions */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold truncate">{profile.name}</h3>
            <Badge
              variant={profile.isActive ? 'default' : 'secondary'}
              className="text-xs shrink-0"
            >
              {profile.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {profile.lastSearched && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Searched {formatDistanceToNow(new Date(profile.lastSearched), { addSuffix: true })}
            </p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {onTriggerSearch && profile.isActive && (
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onTriggerSearch} title="Run Search">
              <Search className="h-3.5 w-3.5" />
            </Button>
          )}
          {onToggleActive && (
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onToggleActive} title={profile.isActive ? 'Deactivate' : 'Activate'}>
              <Power className={cn('h-3.5 w-3.5', profile.isActive && 'text-green-500')} />
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onEdit} title="Edit">
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onDelete} title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Job Titles (badges, max 4) */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {profile.jobTitles.slice(0, 4).map((title) => (
          <Badge key={title} variant="secondary" className="text-xs">
            {title}
          </Badge>
        ))}
        {profile.jobTitles.length > 4 && (
          <Badge variant="outline" className="text-xs">
            +{profile.jobTitles.length - 4} more
          </Badge>
        )}
      </div>

      {/* Summary Line */}
      {summaryParts.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{summaryParts.join(' | ')}</span>
          {salary && (
            <>
              <span className="mx-1">|</span>
              <DollarSign className="h-3 w-3 shrink-0" />
              <span>{salary}</span>
            </>
          )}
        </div>
      )}

      {/* Platforms */}
      <div className="flex flex-wrap gap-1.5">
        {profile.platforms.map((platform) => (
          <Badge key={platform} variant="outline" className="text-xs capitalize">
            {platform}
          </Badge>
        ))}
      </div>

      {/* Keywords (compact, only if present) */}
      {(profile.includeKeywords.length > 0 || profile.excludeKeywords.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
          {profile.includeKeywords.slice(0, 3).map((kw) => (
            <Badge key={kw} variant="default" className="text-xs">
              +{kw}
            </Badge>
          ))}
          {profile.excludeKeywords.slice(0, 3).map((kw) => (
            <Badge key={kw} variant="destructive" className="text-xs">
              -{kw}
            </Badge>
          ))}
          {(profile.includeKeywords.length + profile.excludeKeywords.length > 6) && (
            <span className="text-xs text-muted-foreground">
              +{profile.includeKeywords.length + profile.excludeKeywords.length - 6} more
            </span>
          )}
        </div>
      )}
    </Card>
  )
}
