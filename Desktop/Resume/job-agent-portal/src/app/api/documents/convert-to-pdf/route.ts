import { NextRequest } from 'next/server'
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/** Find the LibreOffice binary path on macOS or Linux */
function findSofficePath(): string {
  const candidates = [
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    '/usr/bin/soffice',
    '/usr/local/bin/soffice',
    '/opt/homebrew/bin/soffice',
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return 'soffice' // fallback to PATH
}

/**
 * POST /api/documents/convert-to-pdf
 * Convert Word document to PDF using LibreOffice headless.
 * Produces exact format-preserving PDFs that match the Word document layout.
 */
export async function POST(request: NextRequest) {
  try {
    await getUserIdFromRequest(request)
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return badRequestResponse('No file uploaded')
    }

    if (!file.name.endsWith('.docx')) {
      return badRequestResponse('Only .docx files are supported')
    }

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'conversions')
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true })
    }

    const timestamp = Date.now()
    const originalFilename = file.name.replace('.docx', '')

    // Write DOCX to a temp file (LibreOffice needs a file path)
    const tempDocxPath = join(uploadsDir, `${originalFilename}_${timestamp}.docx`)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(tempDocxPath, buffer)

    try {
      // Convert DOCX → PDF using LibreOffice headless
      const sofficePath = findSofficePath()
      await execFileAsync(sofficePath, [
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', uploadsDir,
        tempDocxPath,
      ], { timeout: 30000 })

      // LibreOffice outputs the PDF with the same base name as the input
      const pdfFilename = `${originalFilename}_${timestamp}.pdf`
      const pdfPath = join(uploadsDir, pdfFilename)

      // Verify the PDF was created
      if (!existsSync(pdfPath)) {
        throw new Error('LibreOffice did not produce a PDF file')
      }

      // Clean up the temp DOCX
      await unlink(tempDocxPath).catch(() => {})

      return successResponse({
        pdfUrl: `/uploads/conversions/${pdfFilename}`,
        originalFilename: file.name,
      })
    } catch (conversionError) {
      // Clean up temp file on error
      await unlink(tempDocxPath).catch(() => {})
      throw conversionError
    }
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('POST /api/documents/convert-to-pdf error:', error)
    return serverErrorResponse('Failed to convert document to PDF')
  }
}
