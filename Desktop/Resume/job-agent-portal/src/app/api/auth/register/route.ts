import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { registerSchema } from '@/lib/validators/auth-schema'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validatedFields = registerSchema.safeParse(body)

    if (!validatedFields.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: validatedFields.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { email, name, password, phone, location, linkedinUrl } = validatedFields.data

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))

    if (existingUser.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'User with this email already exists',
        },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        name,
        passwordHash,
        phone: phone || null,
        location: location || null,
        linkedinUrl: linkedinUrl || null,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
      })

    return NextResponse.json(
      {
        success: true,
        data: {
          user: newUser,
        },
        message: 'Account created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create account',
      },
      { status: 500 }
    )
  }
}
