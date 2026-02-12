import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { searchProfiles } from '@/lib/db/schema'
import { createProfileSchema } from '@/lib/validators/profile-schema'
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { eq, desc } from 'drizzle-orm'

/**
 * GET /api/profiles
 * List all search profiles for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)

    const profiles = await db
      .select()
      .from(searchProfiles)
      .where(eq(searchProfiles.userId, userId))
      .orderBy(desc(searchProfiles.createdAt))

    // Parse JSON fields for each profile
    const parsedProfiles = profiles.map((profile) => ({
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
    }))

    return successResponse(parsedProfiles)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('GET /api/profiles error:', error)
    return serverErrorResponse('Failed to fetch profiles')
  }
}

/**
 * POST /api/profiles
 * Create a new search profile
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    const body = await request.json()

    // Validate input
    const validation = createProfileSchema.safeParse(body)

    if (!validation.success) {
      return badRequestResponse('Invalid profile data')
    }

    const data = validation.data

    // Insert profile with JSON-stringified array fields
    const [newProfile] = await db
      .insert(searchProfiles)
      .values({
        userId,
        name: data.name,
        isActive: data.isActive,
        jobTitles: JSON.stringify(data.jobTitles),
        skills: JSON.stringify(data.skills),
        locations: JSON.stringify(data.locations),
        isRemote: data.isRemote,
        employmentTypes: JSON.stringify(data.employmentTypes),
        minSalary: data.minSalary,
        maxSalary: data.maxSalary,
        salaryType: data.salaryType,
        excludeKeywords: JSON.stringify(data.excludeKeywords),
        includeKeywords: JSON.stringify(data.includeKeywords),
        platforms: JSON.stringify(data.platforms),
        domain: data.domain,
        notes: data.notes,
      })
      .returning()

    // Parse JSON fields for response
    const parsedProfile = {
      ...newProfile,
      jobTitles: JSON.parse(newProfile.jobTitles),
      skills: JSON.parse(newProfile.skills || '[]'),
      locations: JSON.parse(newProfile.locations || '["United States"]'),
      employmentTypes: JSON.parse(newProfile.employmentTypes || '["contract", "c2c"]'),
      excludeKeywords: JSON.parse(newProfile.excludeKeywords || '[]'),
      includeKeywords: JSON.parse(newProfile.includeKeywords || '[]'),
      platforms: JSON.parse(
        newProfile.platforms || '["indeed","dice","glassdoor","ziprecruiter","linkedin"]'
      ),
    }

    return createdResponse(parsedProfile, 'Profile created successfully')
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('POST /api/profiles error:', error)
    return serverErrorResponse('Failed to create profile')
  }
}
