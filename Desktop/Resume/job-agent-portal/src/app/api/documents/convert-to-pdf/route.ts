import { NextRequest } from 'next/server'
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import mammoth from 'mammoth'
import * as cheerio from 'cheerio'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

// ── PDF layout constants ────────────────────────────────────────────────
const PAGE_WIDTH = 612   // US Letter
const PAGE_HEIGHT = 792
const MARGIN_TOP = 60
const MARGIN_BOTTOM = 60
const MARGIN_LEFT = 55
const MARGIN_RIGHT = 55
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
const LINE_HEIGHT_BODY = 16
const LINE_HEIGHT_H1 = 28
const LINE_HEIGHT_H2 = 22
const LINE_HEIGHT_H3 = 19
const FONT_SIZE_BODY = 10.5
const FONT_SIZE_H1 = 18
const FONT_SIZE_H2 = 14
const FONT_SIZE_H3 = 12
const BULLET_INDENT = 18

interface TextBlock {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'hr' | 'gap'
  text: string
  bold?: boolean
}

/**
 * Parse mammoth HTML output into structured text blocks.
 */
function parseHtmlToBlocks(html: string): TextBlock[] {
  const $ = cheerio.load(html)
  const blocks: TextBlock[] = []

  $('body').children().each((_, el) => {
    const $el = $(el)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tag = ((el as any).tagName || (el as any).name || '').toLowerCase()

    if (tag === 'h1') {
      blocks.push({ type: 'h1', text: $el.text().trim() })
    } else if (tag === 'h2') {
      blocks.push({ type: 'h2', text: $el.text().trim() })
    } else if (tag === 'h3') {
      blocks.push({ type: 'h3', text: $el.text().trim() })
    } else if (tag === 'hr') {
      blocks.push({ type: 'hr', text: '' })
    } else if (tag === 'ul' || tag === 'ol') {
      $el.children('li').each((_, li) => {
        blocks.push({ type: 'li', text: $(li).text().trim() })
      })
    } else if (tag === 'p') {
      const text = $el.text().trim()
      if (text.length === 0) {
        blocks.push({ type: 'gap', text: '' })
      } else {
        // Check if the paragraph is mostly bold (like a sub-heading)
        const boldText = $el.find('strong, b').text().trim()
        const isBold = boldText.length > 0 && boldText.length >= text.length * 0.6
        blocks.push({ type: 'p', text, bold: isBold })
      }
    } else if (tag === 'table') {
      // Flatten table rows into text lines
      $el.find('tr').each((_, tr) => {
        const cells: string[] = []
        $(tr).find('td, th').each((_, td) => {
          cells.push($(td).text().trim())
        })
        if (cells.length > 0) {
          blocks.push({ type: 'p', text: cells.join('  |  ') })
        }
      })
    } else {
      // Fallback: extract text from unknown elements
      const text = $el.text().trim()
      if (text) {
        blocks.push({ type: 'p', text })
      }
    }
  })

  return blocks
}

/**
 * Wrap text to fit within a given width using the specified font and size.
 */
function wrapText(
  text: string,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const width = font.widthOfTextAtSize(testLine, fontSize)

    if (width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.length > 0 ? lines : ['']
}

/**
 * POST /api/documents/convert-to-pdf
 * Convert Word document to PDF using mammoth + pdf-lib (no external tools needed)
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

    // Convert DOCX → HTML using mammoth
    const { value: html } = await mammoth.convertToHtml({ buffer })

    // Parse HTML into structured blocks
    const blocks = parseHtmlToBlocks(html)

    if (blocks.length === 0) {
      return badRequestResponse('Document appears to be empty')
    }

    // ── Build PDF with pdf-lib ──────────────────────────────────────
    const pdfDoc = await PDFDocument.create()

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const black = rgb(0, 0, 0)
    const darkGray = rgb(0.25, 0.25, 0.25)
    const medGray = rgb(0.45, 0.45, 0.45)

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    let y = PAGE_HEIGHT - MARGIN_TOP

    /** Add a new page and reset cursor */
    function newPage() {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - MARGIN_TOP
    }

    /** Ensure enough space, otherwise start a new page */
    function ensureSpace(needed: number) {
      if (y - needed < MARGIN_BOTTOM) {
        newPage()
      }
    }

    /** Draw a horizontal rule */
    function drawHR() {
      ensureSpace(12)
      y -= 6
      page.drawLine({
        start: { x: MARGIN_LEFT, y },
        end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
        thickness: 0.5,
        color: medGray,
      })
      y -= 6
    }

    for (const block of blocks) {
      if (block.type === 'gap') {
        y -= 6
        continue
      }

      if (block.type === 'hr') {
        drawHR()
        continue
      }

      // Determine font, size, color, and indentation
      let font = fontRegular
      let fontSize = FONT_SIZE_BODY
      let lineHeight = LINE_HEIGHT_BODY
      let color = darkGray
      let indent = 0
      let prefix = ''
      let spaceBefore = 2
      let spaceAfter = 2

      switch (block.type) {
        case 'h1':
          font = fontBold
          fontSize = FONT_SIZE_H1
          lineHeight = LINE_HEIGHT_H1
          color = black
          spaceBefore = 8
          spaceAfter = 4
          break
        case 'h2':
          font = fontBold
          fontSize = FONT_SIZE_H2
          lineHeight = LINE_HEIGHT_H2
          color = black
          spaceBefore = 10
          spaceAfter = 3
          break
        case 'h3':
          font = fontBold
          fontSize = FONT_SIZE_H3
          lineHeight = LINE_HEIGHT_H3
          color = black
          spaceBefore = 6
          spaceAfter = 2
          break
        case 'li':
          indent = BULLET_INDENT
          prefix = '\u2022  '
          fontSize = FONT_SIZE_BODY
          break
        case 'p':
          if (block.bold) {
            font = fontBold
            color = black
          }
          break
      }

      const maxWidth = CONTENT_WIDTH - indent
      const textToWrap = prefix + block.text
      const lines = wrapText(textToWrap, font, fontSize, maxWidth)

      // Space needed for this block
      const totalNeeded = spaceBefore + lines.length * lineHeight + spaceAfter
      ensureSpace(totalNeeded)

      y -= spaceBefore

      for (const line of lines) {
        page.drawText(line, {
          x: MARGIN_LEFT + indent,
          y,
          size: fontSize,
          font,
          color,
        })
        y -= lineHeight
      }

      y -= spaceAfter

      // Draw underline after h2 headings
      if (block.type === 'h2') {
        page.drawLine({
          start: { x: MARGIN_LEFT, y: y + 2 },
          end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: y + 2 },
          thickness: 0.5,
          color: medGray,
        })
        y -= 2
      }
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save()
    await writeFile(pdfPath, pdfBytes)

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
