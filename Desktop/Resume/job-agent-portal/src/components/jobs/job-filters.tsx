'use client'

import { JobFilterParams, Platform, EmploymentType } from '@/types/job'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'

interface JobFiltersProps {
  filters: JobFilterParams
  onChange: (filters: JobFilterParams) => void
  onReset: () => void
}

const platforms: Platform[] = [
  'indeed', 'dice', 'linkedin', 'glassdoor', 'ziprecruiter',
  'simplyhired', 'builtin', 'weworkremotely',
]

const platformDisplayNames: Record<string, string> = {
  indeed: 'Indeed',
  dice: 'Dice',
  linkedin: 'LinkedIn',
  glassdoor: 'Glassdoor',
  ziprecruiter: 'ZipRecruiter',
  simplyhired: 'SimplyHired',
  builtin: 'Built In',
  weworkremotely: 'WeWorkRemotely',
}

const employmentTypes: EmploymentType[] = ['full-time', 'part-time', 'contract', 'c2c', 'temporary', 'contract-to-hire', 'internship']

export function JobFilters({ filters, onChange, onReset }: JobFiltersProps) {
  // Update a single filter and reset offset to page 1
  const updateFilter = (key: keyof JobFilterParams, value: unknown) => {
    onChange({ ...filters, [key]: value, offset: 0 })
  }

  const hasActiveFilters = !!(
    filters.search ||
    filters.platform ||
    filters.employmentType ||
    filters.isRemote ||
    filters.postedAfter ||
    filters.minSalary ||
    filters.maxSalary
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <Input
        placeholder="Search jobs..."
        value={filters.search || ''}
        onChange={(e) => updateFilter('search', e.target.value || undefined)}
        className="w-[200px] h-9 text-sm"
      />

      {/* Platform */}
      <Select
        value={filters.platform || 'all'}
        onValueChange={(value) => updateFilter('platform', value === 'all' ? undefined : value)}
      >
        <SelectTrigger className="w-[150px] h-9 text-sm">
          <SelectValue placeholder="Platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Platforms</SelectItem>
          {platforms.map((platform) => (
            <SelectItem key={platform} value={platform}>
              {platformDisplayNames[platform] || platform}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Employment Type */}
      <Select
        value={filters.employmentType || 'all'}
        onValueChange={(value) => updateFilter('employmentType', value === 'all' ? undefined : value)}
      >
        <SelectTrigger className="w-[150px] h-9 text-sm">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {employmentTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Posted Within */}
      <Select
        value={filters.postedAfter || 'all'}
        onValueChange={(value) => updateFilter('postedAfter', value === 'all' ? undefined : value)}
      >
        <SelectTrigger className="w-[140px] h-9 text-sm">
          <SelectValue placeholder="Posted" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value={new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}>
            Last 24 hours
          </SelectItem>
          <SelectItem value={new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()}>
            Last 3 days
          </SelectItem>
          <SelectItem value={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}>
            Last 7 days
          </SelectItem>
          <SelectItem value={new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()}>
            Last 14 days
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Remote — only sends isRemote=true when checked, removes filter when unchecked */}
      <div className="flex items-center gap-1.5">
        <Checkbox
          id="remote-filter"
          checked={filters.isRemote === true}
          onCheckedChange={(checked) => updateFilter('isRemote', checked === true ? true : undefined)}
        />
        <Label htmlFor="remote-filter" className="text-sm cursor-pointer">
          Remote
        </Label>
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={onReset}>
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
