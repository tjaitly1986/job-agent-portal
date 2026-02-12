import { z } from 'zod'

// Update user profile
export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().min(8).optional(),
  newPassword: z.string().min(8).optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
