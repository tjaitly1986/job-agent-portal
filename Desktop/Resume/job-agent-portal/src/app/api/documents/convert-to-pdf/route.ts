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
    const userId = await getUserIdFromRequest(request)
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
      // Try LibreOffice first
      await execAsync(
        `soffice --headless --convert-to pdf --outdir "${uploadsDir}" "${docxPath}"`
      )
    } catch (error) {
      // Fallback: Use pdf-lib for basic conversion
      // This is a simplified version - for production, use a proper conversion service
      console.warn('LibreOffice not available, using fallback method')

      // Import pdf-lib dynamically
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
      const mammoth = await import('mammoth')

      // Extract text from docx
      const result = await mammoth.extractRawText({ buffer })
      const text = result.value

      // Create PDF
      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const fontSize = 11
      const margin = 50
      const lineHeight = fontSize * 1.2

      let page = pdfDoc.addPage([612, 792]) // Letter size
      let y = page.getHeight() - margin

      const lines = text.split('\n')
      for (const line of lines) {
        if (y < margin) {
          page = pdfDoc.addPage([612, 792])
          y = page.getHeight() - margin
        }

        page.drawText(line.substring(0, 80), {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        })

        y -= lineHeight
      }

      const pdfBytes = await pdfDoc.save()
      await writeFile(pdfPath, pdfBytes)
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
