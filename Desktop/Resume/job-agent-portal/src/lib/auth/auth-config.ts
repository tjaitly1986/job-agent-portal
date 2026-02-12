import { NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { loginSchema } from '@/lib/validators/auth-schema'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    newUser: '/dashboard/jobs',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Validate credentials
          const validatedFields = loginSchema.safeParse(credentials)

          if (!validatedFields.success) {
            return null
          }

          const { email, password } = validatedFields.data

          // Find user
          const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()))

          if (!user || !user.passwordHash) {
            return null
          }

          // Verify password
          const passwordMatch = await bcrypt.compare(password, user.passwordHash)

          if (!passwordMatch) {
            return null
          }

          // Return user object
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image ?? undefined,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),

    // Google OAuth (optional)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // GitHub OAuth (optional)
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
      }
      return session
    },
  },
  events: {
    async signIn({ user }) {
      // User signed in successfully
      if (user) {
        // Could log to external service here
      }
    },
  },
}
