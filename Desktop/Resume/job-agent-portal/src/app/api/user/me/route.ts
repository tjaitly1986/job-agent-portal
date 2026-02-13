import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { updateUserSchema } from '@/lib/validators/user-schema'
import {
  successResponse,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { eq, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

/**
 * GET /api/user/me
 * Get current user information
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

    if (!user) {
      return badRequestResponse('User not found')
    }

    // Remove sensitive fields
    const { passwordHash: _passwordHash, ...userWithoutPassword } = user

    return successResponse(userWithoutPassword)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('GET /api/user/me error:', error)
    return serverErrorResponse('Failed to fetch user')
  }
}

/**
 * PATCH /api/user/me
 * Update current user information
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    const body = await request.json()

    // Validate input
    const validation = updateUserSchema.safeParse(body)

    if (!validation.success) {
      return badRequestResponse('Invalid user data')
    }

    const data = validation.data

    // If changing password, validate current password
    if (data.newPassword) {
      if (!data.currentPassword) {
        return badRequestResponse('Current password is required to change password')
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

      if (!user || !user.passwordHash) {
        return badRequestResponse('User not found')
      }

      const isPasswordValid = await bcrypt.compare(
        data.currentPassword,
        user.passwordHash
      )

      if (!isPasswordValid) {
        return badRequestResponse('Current password is incorrect')
      }
    }

    // If changing email, check if it's already taken
    if (data.email) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1)

      if (existingUser && existingUser.id !== userId) {
        return badRequestResponse('Email is already taken')
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: sql`(datetime('now'))`,
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email
    if (data.newPassword !== undefined) {
      updateData.passwordHash = await bcrypt.hash(data.newPassword, 10)
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning()

    // Remove sensitive fields
    const { passwordHash: _passwordHash, ...userWithoutPassword } = updatedUser

    return successResponse(userWithoutPassword, 'Profile updated successfully')
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('PATCH /api/user/me error:', error)
    return serverErrorResponse('Failed to update user')
  }
}
