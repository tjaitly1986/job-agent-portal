'use client'

import { useState } from 'react'
import { JobFilterParams, Platform, EmploymentType } from '@/types/job'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Filter, X } from 'lucide-react'

interface JobFiltersProps {
  filters: JobFilterParams
  onChange: (filters: JobFilterParams) => void
  onReset: () => void
}

const platforms: Platform[] = ['indeed', 'dice', 'glassdoor', 'ziprecruiter', 'linkedin']
const employmentTypes: EmploymentType[] = ['full-time', 'part-time', 'contract', 'c2c', 'temporary', 'contract-to-hire']

export function JobFilters({ filters, onChange, onReset }: JobFiltersProps) {
  const updateFilter = (key: keyof JobFilterParams, value: unknown) => {
    onChange({ ...filters, [key]: value })
  }

  return (
    <Card className="sticky top-4 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      <div className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Job title, company, skills..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>

        <Separator />

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="City, state, or remote"
            value={filters.location || ''}
            onChange={(e) => updateFilter('location', e.target.value)}
          />
        </div>

        <Separator />

        {/* Remote */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remote"
            checked={filters.isRemote}
            onCheckedChange={(checked) => updateFilter('isRemote', checked)}
          />
          <Label htmlFor="remote" className="cursor-pointer">
            Remote only
          </Label>
        </div>

        <Separator />

        {/* Platform */}
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select
            value={filters.platform || 'all'}
            onValueChange={(value) => updateFilter('platform', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {platforms.map((platform) => (
                <SelectItem key={platform} value={platform}>
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Employment Type */}
        <div className="space-y-2">
          <Label>Employment Type</Label>
          <Select
            value={filters.employmentType || 'all'}
            onValueChange={(value) => updateFilter('employmentType', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {employmentTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Salary Range */}
        <div className="space-y-3">
          <Label>Salary Range ($/hr)</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="minSalary" className="text-xs text-muted-foreground">
                Min
              </Label>
              <Input
                id="minSalary"
                type="number"
                placeholder="0"
                value={filters.minSalary || ''}
                onChange={(e) => updateFilter('minSalary', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxSalary" className="text-xs text-muted-foreground">
                Max
              </Label>
              <Input
                id="maxSalary"
                type="number"
                placeholder="200"
                value={filters.maxSalary || ''}
                onChange={(e) => updateFilter('maxSalary', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Posted Within */}
        <div className="space-y-2">
          <Label>Posted Within</Label>
          <Select
            value={filters.postedAfter || 'all'}
            onValueChange={(value) => updateFilter('postedAfter', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
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
        </div>
      </div>
    </Card>
  )
}
