import { auth } from './index'
import { redirect } from 'next/navigation'

/**
 * Get the current session on the server
 */
export async function getSession() {
  return await auth()
}

/**
 * Get the current user on the server
 */
export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/login')
  }

  return session
}

/**
 * Get user ID - throws if not authenticated
 */
export async function getUserId(): Promise<string> {
  const user = await getCurrentUser()

  if (!user?.id) {
    redirect('/login')
  }

  return user.id
}
