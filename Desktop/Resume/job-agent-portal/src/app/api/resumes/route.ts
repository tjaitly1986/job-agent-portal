import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { resumes } from '@/lib/db/schema'
import { parseResumeBuffer } from '@/lib/file-parser'
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { eq, desc } from 'drizzle-orm'
import fs from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'resumes')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * GET /api/resumes
 * List all resumes for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)

    const userResumes = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.createdAt))

    return successResponse(userResumes)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('GET /api/resumes error:', error)
    return serverErrorResponse('Failed to fetch resumes')
  }
}

/**
 * POST /api/resumes
 * Upload a new resume
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const label = formData.get('label') as string | null
    const isDefault = formData.get('isDefault') === 'true'

    if (!file) {
      return badRequestResponse('No file provided')
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    if (!allowedTypes.includes(file.type)) {
      return badRequestResponse('Invalid file type. Only PDF and DOCX are supported')
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return badRequestResponse('File size exceeds 10MB limit')
    }

    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${userId}_${timestamp}_${sanitizedName}`
    const filePath = path.join(UPLOAD_DIR, filename)

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, buffer)

    // Parse resume text
    let parsedText: string | null = null
    try {
      parsedText = await parseResumeBuffer(buffer, file.type)
    } catch (parseError) {
      console.error('Error parsing resume:', parseError)
      // Continue without parsed text - parsing is optional
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await db
        .update(resumes)
        .set({ isDefault: false })
        .where(eq(resumes.userId, userId))
    }

    // Insert resume record
    const [newResume] = await db
      .insert(resumes)
      .values({
        userId,
        filename: file.name,
        filePath,
        fileType: file.type,
        fileSize: file.size,
        parsedText,
        label: label || file.name,
        isDefault,
      })
      .returning()

    return createdResponse(newResume, 'Resume uploaded successfully')
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('POST /api/resumes error:', error)
    return serverErrorResponse('Failed to upload resume')
  }
}
