import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { searchProfiles } from '@/lib/db/schema'
import { updateProfileSchema } from '@/lib/validators/profile-schema'
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { eq, and, sql } from 'drizzle-orm'

/**
 * GET /api/profiles/:id
 * Get a single search profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    const profileId = params.id

    const [profile] = await db
      .select()
      .from(searchProfiles)
      .where(eq(searchProfiles.id, profileId))
      .limit(1)

    if (!profile) {
      return notFoundResponse('Profile not found')
    }

    // Ensure user owns this profile
    if (profile.userId !== userId) {
      return forbiddenResponse('You do not have permission to access this profile')
    }

    // Parse JSON fields
    const parsedProfile = {
      ...profile,
      jobTitles: JSON.parse(profile.jobTitles),
      skills: JSON.parse(profile.skills || '[]'),
      locations: JSON.parse(profile.locations || '["United States"]'),
      employmentTypes: JSON.parse(profile.employmentTypes || '["contract", "c2c"]'),
      excludeKeywords: JSON.parse(profile.excludeKeywords || '[]'),
      includeKeywords: JSON.parse(profile.includeKeywords || '[]'),
      platforms: JSON.parse(
        profile.platforms || '["indeed","dice","glassdoor","ziprecruiter","linkedin"]'
      ),
    }

    return successResponse(parsedProfile)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('GET /api/profiles/:id error:', error)
    return serverErrorResponse('Failed to fetch profile')
  }
}

/**
 * PATCH /api/profiles/:id
 * Update a search profile
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    const profileId = params.id
    const body = await request.json()

    // Validate input
    const validation = updateProfileSchema.safeParse(body)

    if (!validation.success) {
      return badRequestResponse('Invalid profile data')
    }

    const data = validation.data

    // Check if profile exists and user owns it
    const [existingProfile] = await db
      .select()
      .from(searchProfiles)
      .where(eq(searchProfiles.id, profileId))
      .limit(1)

    if (!existingProfile) {
      return notFoundResponse('Profile not found')
    }

    if (existingProfile.userId !== userId) {
      return forbiddenResponse('You do not have permission to update this profile')
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: sql`(datetime('now'))`,
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.jobTitles !== undefined) updateData.jobTitles = JSON.stringify(data.jobTitles)
    if (data.skills !== undefined) updateData.skills = JSON.stringify(data.skills)
    if (data.locations !== undefined) updateData.locations = JSON.stringify(data.locations)
    if (data.isRemote !== undefined) updateData.isRemote = data.isRemote
    if (data.employmentTypes !== undefined)
      updateData.employmentTypes = JSON.stringify(data.employmentTypes)
    if (data.minSalary !== undefined) updateData.minSalary = data.minSalary
    if (data.maxSalary !== undefined) updateData.maxSalary = data.maxSalary
    if (data.salaryType !== undefined) updateData.salaryType = data.salaryType
    if (data.excludeKeywords !== undefined)
      updateData.excludeKeywords = JSON.stringify(data.excludeKeywords)
    if (data.includeKeywords !== undefined)
      updateData.includeKeywords = JSON.stringify(data.includeKeywords)
    if (data.platforms !== undefined) updateData.platforms = JSON.stringify(data.platforms)
    if (data.domain !== undefined) updateData.domain = data.domain
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.lastSearched !== undefined) updateData.lastSearched = data.lastSearched

    // Update profile
    const [updatedProfile] = await db
      .update(searchProfiles)
      .set(updateData)
      .where(and(eq(searchProfiles.id, profileId), eq(searchProfiles.userId, userId)))
      .returning()

    // Parse JSON fields for response
    const parsedProfile = {
      ...updatedProfile,
      jobTitles: JSON.parse(updatedProfile.jobTitles),
      skills: JSON.parse(updatedProfile.skills || '[]'),
      locations: JSON.parse(updatedProfile.locations || '["United States"]'),
      employmentTypes: JSON.parse(updatedProfile.employmentTypes || '["contract", "c2c"]'),
      excludeKeywords: JSON.parse(updatedProfile.excludeKeywords || '[]'),
      includeKeywords: JSON.parse(updatedProfile.includeKeywords || '[]'),
      platforms: JSON.parse(
        updatedProfile.platforms || '["indeed","dice","glassdoor","ziprecruiter","linkedin"]'
      ),
    }

    return successResponse(parsedProfile, 'Profile updated successfully')
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('PATCH /api/profiles/:id error:', error)
    return serverErrorResponse('Failed to update profile')
  }
}

/**
 * DELETE /api/profiles/:id
 * Delete a search profile
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    const profileId = params.id

    // Check if profile exists and user owns it
    const [existingProfile] = await db
      .select()
      .from(searchProfiles)
      .where(eq(searchProfiles.id, profileId))
      .limit(1)

    if (!existingProfile) {
      return notFoundResponse('Profile not found')
    }

    if (existingProfile.userId !== userId) {
      return forbiddenResponse('You do not have permission to delete this profile')
    }

    // Delete profile
    await db
      .delete(searchProfiles)
      .where(and(eq(searchProfiles.id, profileId), eq(searchProfiles.userId, userId)))

    return successResponse({ id: profileId }, 'Profile deleted successfully')
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('DELETE /api/profiles/:id error:', error)
    return serverErrorResponse('Failed to delete profile')
  }
}
