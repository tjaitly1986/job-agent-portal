'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileList } from '@/components/profiles/profile-list'
import { ProfileForm } from '@/components/profiles/profile-form'
import { useProfiles, useCreateProfile, useUpdateProfile, useDeleteProfile } from '@/hooks/use-profiles'
import { SearchProfile } from '@/types/profile'
import { UserCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'

export const dynamic = 'force-dynamic'

export default function ProfilesPage() {
  const { data: profiles, isLoading } = useProfiles()
  const createProfile = useCreateProfile()
  const updateProfile = useUpdateProfile()
  const deleteProfile = useDeleteProfile()
  const { activeModal, modalData, openModal, closeModal } = useUIStore()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<SearchProfile | undefined>()

  const handleCreate = () => {
    setEditingProfile(undefined)
    setIsFormOpen(true)
  }

  const handleEdit = (profile: SearchProfile) => {
    setEditingProfile(profile)
    setIsFormOpen(true)
  }

  const handleDelete = (profile: SearchProfile) => {
    if (confirm(`Are you sure you want to delete "${profile.name}"?`)) {
      deleteProfile.mutate(profile.id)
    }
  }

  const handleToggleActive = (profile: SearchProfile) => {
    updateProfile.mutate({
      id: profile.id,
      input: { isActive: !profile.isActive },
    })
  }

  const handleTriggerSearch = (profile: SearchProfile) => {
    // TODO: Implement trigger search functionality
    console.log('Triggering search for profile:', profile.id)
  }

  const handleSubmit = async (data: any) => {
    if (editingProfile) {
      await updateProfile.mutateAsync({
        id: editingProfile.id,
        input: data,
      })
    } else {
      await createProfile.mutateAsync(data)
    }
    setIsFormOpen(false)
    setEditingProfile(undefined)
  }

  const handleCancel = () => {
    setIsFormOpen(false)
    setEditingProfile(undefined)
  }

  return (
    <div className="space-y-6">
      {!isFormOpen ? (
        <>
          <PageHeader
            icon={UserCircle}
            title="Search Profiles"
            description="Manage your job search criteria and automate job discovery"
            action={{
              label: 'Create Profile',
              onClick: handleCreate,
              icon: Plus,
            }}
          />

          <ProfileList
            profiles={profiles || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            onTriggerSearch={handleTriggerSearch}
          />
        </>
      ) : (
        <>
          <PageHeader
            icon={UserCircle}
            title={editingProfile ? 'Edit Profile' : 'Create Profile'}
            description={
              editingProfile
                ? 'Update your search profile criteria'
                : 'Define your job search preferences'
            }
          />

          <ProfileForm
            profile={editingProfile}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={createProfile.isPending || updateProfile.isPending}
          />
        </>
      )}
    </div>
  )
}
