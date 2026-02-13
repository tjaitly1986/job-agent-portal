'use client'

import { SearchProfile } from '@/types/profile'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Briefcase,
  MapPin,
  DollarSign,
  Edit,
  Trash2,
  Power,
  Search,
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
    if (profile.minSalary) {
      return `From $${profile.minSalary}/hr`
    }
    if (profile.maxSalary) {
      return `Up to $${profile.maxSalary}/hr`
    }
    return null
  }

  const salary = formatSalary()

  return (
    <Card className={cn('p-6', !profile.isActive && 'opacity-60')}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{profile.name}</h3>
              {profile.isActive ? (
                <Badge variant="default" className="text-xs">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            {profile.lastSearched && (
              <p className="mt-1 text-xs text-muted-foreground">
                Last searched {formatDistanceToNow(new Date(profile.lastSearched), { addSuffix: true })}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {onToggleActive && (
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleActive}
                title={profile.isActive ? 'Deactivate' : 'Activate'}
              >
                <Power className={cn('h-4 w-4', profile.isActive && 'text-green-500')} />
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="icon" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="outline" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Job Titles */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Briefcase className="h-4 w-4 text-primary" />
            <span>Job Titles</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.jobTitles.map((title) => (
              <Badge key={title} variant="secondary">
                {title}
              </Badge>
            ))}
          </div>
        </div>

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Skills</div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.slice(0, 6).map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {profile.skills.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{profile.skills.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Location & Remote */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Locations</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {profile.locations.slice(0, 3).map((location) => (
              <Badge key={location} variant="secondary" className="text-xs">
                {location}
              </Badge>
            ))}
            {profile.locations.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{profile.locations.length - 3} more
              </Badge>
            )}
            {profile.isRemote && (
              <Badge variant="default" className="text-xs">
                Remote
              </Badge>
            )}
          </div>
        </div>

        {/* Employment Types & Platforms */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {profile.employmentTypes.map((type) => (
            <Badge key={type} variant="outline" className="text-xs">
              {type.toUpperCase()}
            </Badge>
          ))}
          {salary && (
            <div className="flex items-center gap-1 text-xs font-medium text-primary">
              <DollarSign className="h-3 w-3" />
              <span>{salary}</span>
            </div>
          )}
        </div>

        {/* Platforms */}
        <div className="flex flex-wrap gap-2">
          {profile.platforms.map((platform) => (
            <Badge key={platform} variant="secondary" className="text-xs">
              {platform}
            </Badge>
          ))}
        </div>

        {/* Keywords */}
        {(profile.includeKeywords.length > 0 || profile.excludeKeywords.length > 0) && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-xs">
              {profile.includeKeywords.length > 0 && (
                <div>
                  <div className="mb-1 font-medium text-green-600">Include:</div>
                  <div className="flex flex-wrap gap-1">
                    {profile.includeKeywords.slice(0, 3).map((keyword) => (
                      <Badge key={keyword} variant="default" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {profile.includeKeywords.length > 3 && (
                      <span className="text-muted-foreground">+{profile.includeKeywords.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
              {profile.excludeKeywords.length > 0 && (
                <div>
                  <div className="mb-1 font-medium text-destructive">Exclude:</div>
                  <div className="flex flex-wrap gap-1">
                    {profile.excludeKeywords.slice(0, 3).map((keyword) => (
                      <Badge key={keyword} variant="destructive" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {profile.excludeKeywords.length > 3 && (
                      <span className="text-muted-foreground">+{profile.excludeKeywords.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Notes */}
        {profile.notes && (
          <>
            <Separator />
            <p className="text-xs text-muted-foreground italic line-clamp-2">
              {profile.notes}
            </p>
          </>
        )}

        {/* Trigger Search */}
        {onTriggerSearch && profile.isActive && (
          <>
            <Separator />
            <Button onClick={onTriggerSearch} className="w-full">
              <Search className="mr-2 h-4 w-4" />
              Run Search Now
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}
