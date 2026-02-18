import { NextRequest } from 'next/server'
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import mammoth from 'mammoth'
import { chromium } from 'playwright-core'

/**
 * Build a styled HTML document from mammoth's raw HTML output.
 * This CSS closely mirrors a professional resume/document layout.
 */
function wrapInStyledHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: letter; margin: 0.6in 0.55in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
    color: #333;
    max-width: 7.5in;
    margin: 0 auto;
    padding: 0.6in 0.55in;
  }
  h1 {
    font-size: 18pt;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 2pt 0;
    letter-spacing: 0.5pt;
  }
  h2 {
    font-size: 13pt;
    font-weight: 700;
    color: #1a1a1a;
    margin: 14pt 0 4pt 0;
    padding-bottom: 3pt;
    border-bottom: 1.5px solid #2563eb;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
  }
  h3 {
    font-size: 11pt;
    font-weight: 700;
    color: #1a1a1a;
    margin: 8pt 0 2pt 0;
  }
  p {
    margin: 3pt 0;
    text-align: justify;
  }
  p strong, p b {
    color: #1a1a1a;
  }
  ul, ol {
    margin: 2pt 0 4pt 18pt;
    padding: 0;
  }
  li {
    margin: 2pt 0;
    padding-left: 2pt;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 4pt 0;
    font-size: 10pt;
  }
  td, th {
    padding: 2pt 6pt;
    text-align: left;
    vertical-align: top;
  }
  hr {
    border: none;
    border-top: 1px solid #ccc;
    margin: 8pt 0;
  }
  img { display: none; }
  a { color: #2563eb; text-decoration: none; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`
}

/**
 * POST /api/documents/convert-to-pdf
 * Convert Word document to PDF using mammoth (DOCX→HTML) + Playwright (HTML→PDF).
 * Produces high-fidelity PDFs that preserve formatting, fonts, and layout.
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
    const pdfFilename = `${originalFilename}_${timestamp}.pdf`
    const pdfPath = join(uploadsDir, pdfFilename)

    // Read DOCX buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Convert DOCX → HTML using mammoth (preserves structure + inline styles)
    const { value: html } = await mammoth.convertToHtml({ buffer })

    if (!html || html.trim().length === 0) {
      return badRequestResponse('Document appears to be empty')
    }

    // Wrap in styled HTML document
    const fullHtml = wrapInStyledHtml(html)

    // Render HTML → PDF using headless Chromium via playwright-core
    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage()
      await page.setContent(fullHtml, { waitUntil: 'networkidle' })

      const pdfBytes = await page.pdf({
        format: 'Letter',
        margin: { top: '0.6in', bottom: '0.6in', left: '0.55in', right: '0.55in' },
        printBackground: true,
      })

      await writeFile(pdfPath, pdfBytes)
    } finally {
      await browser.close()
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
