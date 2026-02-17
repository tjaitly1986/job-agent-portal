'use client'

import { useState } from 'react'
import { SearchProfile, CreateProfileInput } from '@/types/profile'
import { Platform, EmploymentType } from '@/types/job'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { X, Plus } from 'lucide-react'

interface ProfileFormProps {
  profile?: SearchProfile
  onSubmit: (data: CreateProfileInput) => void
  onCancel: () => void
  isLoading?: boolean
}

const platforms: Platform[] = ['indeed', 'dice', 'glassdoor', 'ziprecruiter', 'linkedin']
const employmentTypes: EmploymentType[] = ['full-time', 'part-time', 'contract', 'c2c', 'temporary', 'internship']

export function ProfileForm({ profile, onSubmit, onCancel, isLoading }: ProfileFormProps) {
  const [formData, setFormData] = useState<CreateProfileInput>({
    name: profile?.name || '',
    isActive: profile?.isActive ?? true,
    jobTitles: profile?.jobTitles || [],
    skills: profile?.skills || [],
    locations: profile?.locations || ['United States'],
    isRemote: profile?.isRemote ?? true,
    employmentTypes: profile?.employmentTypes || ['contract', 'c2c'],
    minSalary: profile?.minSalary || undefined,
    maxSalary: profile?.maxSalary || undefined,
    salaryType: profile?.salaryType || 'hourly',
    excludeKeywords: profile?.excludeKeywords || [],
    includeKeywords: profile?.includeKeywords || [],
    platforms: profile?.platforms || ['indeed', 'dice', 'linkedin'],
    domain: profile?.domain || undefined,
    notes: profile?.notes || undefined,
  })

  const [inputValues, setInputValues] = useState({
    jobTitle: '',
    skill: '',
    location: '',
    excludeKeyword: '',
    includeKeyword: '',
  })

  const handleArrayAdd = (field: keyof CreateProfileInput, value: string, inputKey: keyof typeof inputValues) => {
    if (!value.trim()) return
    const currentArray = (formData[field] as string[]) || []
    if (!currentArray.includes(value.trim())) {
      setFormData({
        ...formData,
        [field]: [...currentArray, value.trim()],
      })
      setInputValues({ ...inputValues, [inputKey]: '' })
    }
  }

  const handleArrayRemove = (field: keyof CreateProfileInput, value: string) => {
    setFormData({
      ...formData,
      [field]: ((formData[field] as string[]) || []).filter((item) => item !== value),
    })
  }

  const togglePlatform = (platform: Platform) => {
    const current = formData.platforms || []
    setFormData({
      ...formData,
      platforms: current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform],
    })
  }

  const toggleEmploymentType = (type: EmploymentType) => {
    const current = formData.employmentTypes || []
    setFormData({
      ...formData,
      employmentTypes: current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type],
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Auto-add any typed-but-not-submitted values before submitting
    const finalData = { ...formData }
    if (inputValues.jobTitle.trim()) {
      const current = finalData.jobTitles || []
      if (!current.includes(inputValues.jobTitle.trim())) {
        finalData.jobTitles = [...current, inputValues.jobTitle.trim()]
      }
    }
    if (inputValues.skill.trim()) {
      const current = finalData.skills || []
      if (!current.includes(inputValues.skill.trim())) {
        finalData.skills = [...current, inputValues.skill.trim()]
      }
    }
    if (inputValues.location.trim()) {
      const current = finalData.locations || []
      if (!current.includes(inputValues.location.trim())) {
        finalData.locations = [...current, inputValues.location.trim()]
      }
    }
    if (inputValues.includeKeyword.trim()) {
      const current = finalData.includeKeywords || []
      if (!current.includes(inputValues.includeKeyword.trim())) {
        finalData.includeKeywords = [...current, inputValues.includeKeyword.trim()]
      }
    }
    if (inputValues.excludeKeyword.trim()) {
      const current = finalData.excludeKeywords || []
      if (!current.includes(inputValues.excludeKeyword.trim())) {
        finalData.excludeKeywords = [...current, inputValues.excludeKeyword.trim()]
      }
    }
    onSubmit(finalData)
  }

  return (
    <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Profile Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Profile Name*</Label>
            <Input
              id="name"
              placeholder="e.g., AI Solution Architect - Remote"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: Boolean(checked) })}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active (will be included in automated searches)
            </Label>
          </div>

          <Separator />

          {/* Job Titles */}
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Titles*</Label>
            <div className="flex gap-2">
              <Input
                id="jobTitle"
                placeholder="e.g., AI Solution Architect"
                value={inputValues.jobTitle}
                onChange={(e) => setInputValues({ ...inputValues, jobTitle: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleArrayAdd('jobTitles', inputValues.jobTitle, 'jobTitle')
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleArrayAdd('jobTitles', inputValues.jobTitle, 'jobTitle')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.jobTitles?.map((title) => (
                <Badge key={title} variant="secondary" className="gap-1">
                  {title}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleArrayRemove('jobTitles', title)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label htmlFor="skill">Required Skills</Label>
            <div className="flex gap-2">
              <Input
                id="skill"
                placeholder="e.g., Python, AWS, Machine Learning"
                value={inputValues.skill}
                onChange={(e) => setInputValues({ ...inputValues, skill: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleArrayAdd('skills', inputValues.skill, 'skill')
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleArrayAdd('skills', inputValues.skill, 'skill')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.skills?.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleArrayRemove('skills', skill)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Locations */}
          <div className="space-y-2">
            <Label htmlFor="location">Locations</Label>
            <div className="flex gap-2">
              <Input
                id="location"
                placeholder="e.g., San Francisco, CA"
                value={inputValues.location}
                onChange={(e) => setInputValues({ ...inputValues, location: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleArrayAdd('locations', inputValues.location, 'location')
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleArrayAdd('locations', inputValues.location, 'location')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.locations?.map((location) => (
                <Badge key={location} variant="secondary" className="gap-1">
                  {location}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleArrayRemove('locations', location)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Remote */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isRemote"
              checked={formData.isRemote}
              onCheckedChange={(checked) => setFormData({ ...formData, isRemote: Boolean(checked) })}
            />
            <Label htmlFor="isRemote" className="cursor-pointer">
              Include remote jobs
            </Label>
          </div>

          <Separator />

          {/* Employment Types */}
          <div className="space-y-2">
            <Label>Employment Types</Label>
            <div className="grid grid-cols-2 gap-2">
              {employmentTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`emp-${type}`}
                    checked={formData.employmentTypes?.includes(type)}
                    onCheckedChange={() => toggleEmploymentType(type)}
                  />
                  <Label htmlFor={`emp-${type}`} className="cursor-pointer text-sm">
                    {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Platforms */}
          <div className="space-y-2">
            <Label>Job Platforms</Label>
            <div className="grid grid-cols-2 gap-2">
              {platforms.map((platform) => (
                <div key={platform} className="flex items-center space-x-2">
                  <Checkbox
                    id={`platform-${platform}`}
                    checked={formData.platforms?.includes(platform)}
                    onCheckedChange={() => togglePlatform(platform)}
                  />
                  <Label htmlFor={`platform-${platform}`} className="cursor-pointer text-sm">
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Salary Range */}
          <div className="space-y-3">
            <Label>Salary Range ($/hr)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minSalary" className="text-sm text-muted-foreground">
                  Minimum
                </Label>
                <Input
                  id="minSalary"
                  type="number"
                  placeholder="60"
                  value={formData.minSalary || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minSalary: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxSalary" className="text-sm text-muted-foreground">
                  Maximum
                </Label>
                <Input
                  id="maxSalary"
                  type="number"
                  placeholder="150"
                  value={formData.maxSalary || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxSalary: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Keywords */}
          <div className="grid grid-cols-2 gap-4">
            {/* Include Keywords */}
            <div className="space-y-2">
              <Label htmlFor="includeKeyword">Include Keywords</Label>
              <div className="flex gap-2">
                <Input
                  id="includeKeyword"
                  placeholder="Must contain..."
                  value={inputValues.includeKeyword}
                  onChange={(e) => setInputValues({ ...inputValues, includeKeyword: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleArrayAdd('includeKeywords', inputValues.includeKeyword, 'includeKeyword')
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleArrayAdd('includeKeywords', inputValues.includeKeyword, 'includeKeyword')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.includeKeywords?.map((keyword) => (
                  <Badge key={keyword} variant="default" className="gap-1">
                    {keyword}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleArrayRemove('includeKeywords', keyword)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Exclude Keywords */}
            <div className="space-y-2">
              <Label htmlFor="excludeKeyword">Exclude Keywords</Label>
              <div className="flex gap-2">
                <Input
                  id="excludeKeyword"
                  placeholder="Must not contain..."
                  value={inputValues.excludeKeyword}
                  onChange={(e) => setInputValues({ ...inputValues, excludeKeyword: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleArrayAdd('excludeKeywords', inputValues.excludeKeyword, 'excludeKeyword')
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleArrayAdd('excludeKeywords', inputValues.excludeKeyword, 'excludeKeyword')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.excludeKeywords?.map((keyword) => (
                  <Badge key={keyword} variant="destructive" className="gap-1">
                    {keyword}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleArrayRemove('excludeKeywords', keyword)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes or preferences..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !formData.name || (!formData.jobTitles?.length && !inputValues.jobTitle.trim())}>
            {isLoading ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
          </Button>
        </div>
    </form>
  )
}
