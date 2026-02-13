import { NextRequest } from 'next/server'
import { auth } from '../auth'
import { unauthorizedResponse } from './response'

/**
 * Get the current user from the request
 * Returns null if not authenticated
 */
export async function getCurrentUserFromRequest(_request: NextRequest) {
  try {
    const session = await auth()
    return session?.user || null
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

/**
 * Require authentication for an API route
 * Returns user or throws unauthorized response
 */
export async function requireAuthApi(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request)

  if (!user) {
    throw unauthorizedResponse('Authentication required')
  }

  return user
}

/**
 * Get user ID from request or throw unauthorized
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string> {
  const user = await requireAuthApi(request)
  return user.id
}
