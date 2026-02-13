import { NextRequest } from 'next/server'
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * POST /api/documents/convert-to-pdf
 * Convert Word document to PDF
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
    const docxFilename = `${originalFilename}_${timestamp}.docx`
    const pdfFilename = `${originalFilename}_${timestamp}.pdf`

    const docxPath = join(uploadsDir, docxFilename)
    const pdfPath = join(uploadsDir, pdfFilename)

    // Save uploaded file
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(docxPath, buffer)

    // Convert using LibreOffice (cross-platform solution)
    // Note: LibreOffice must be installed on the server
    try {
      // Try LibreOffice first - it preserves all formatting
      await execAsync(
        `soffice --headless --convert-to pdf --outdir "${uploadsDir}" "${docxPath}"`
      )

      // LibreOffice creates a PDF with the same name as the docx file but with .pdf extension
      // We need to rename it to our desired filename
      const libreOfficePdfPath = docxPath.replace('.docx', '.pdf')

      // Check if LibreOffice created the PDF
      if (existsSync(libreOfficePdfPath)) {
        // Rename to our desired filename
        const { rename } = await import('fs/promises')
        await rename(libreOfficePdfPath, pdfPath)
      } else {
        throw new Error('LibreOffice did not create PDF file')
      }
    } catch (error) {
      // If LibreOffice is not available or fails, return an error
      // Do NOT use fallback that strips formatting
      console.error('LibreOffice conversion failed:', error)
      return serverErrorResponse(
        'PDF conversion requires LibreOffice to be installed. Please install LibreOffice or use the Word document directly.'
      )
    }

    return successResponse({
      pdfUrl: `/uploads/conversions/${pdfFilename}`,
      originalFilename: file.name,
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('POST /api/documents/convert-to-pdf error:', error)
    return serverErrorResponse('Failed to convert document to PDF')
  }
}
