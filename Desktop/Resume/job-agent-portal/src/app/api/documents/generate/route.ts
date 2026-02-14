import { NextRequest } from 'next/server'
import { successResponse, badRequestResponse, serverErrorResponse } from '@/lib/api/response'
import { getUserIdFromRequest } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { users, resumes } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
} from 'docx'
import JSZip from 'jszip'
import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

interface ResumeData {
  text: string
  name: string
  filePath?: string
  fileType?: string
}

/**
 * Get the user's resume text and file info from the resumes table,
 * falling back to users.resumeText if no uploads exist
 */
async function getResumeData(userId: string): Promise<ResumeData | null> {
  // First try to get the default uploaded resume
  const defaultResume = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.userId, userId), eq(resumes.isDefault, true)))
    .limit(1)

  if (defaultResume[0]?.parsedText) {
    const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId))
    return {
      text: defaultResume[0].parsedText,
      name: user?.name || 'Candidate',
      filePath: defaultResume[0].filePath,
      fileType: defaultResume[0].fileType,
    }
  }

  // If no default, try the most recent uploaded resume
  const latestResume = await db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.createdAt))
    .limit(1)

  if (latestResume[0]?.parsedText) {
    const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId))
    return {
      text: latestResume[0].parsedText,
      name: user?.name || 'Candidate',
      filePath: latestResume[0].filePath,
      fileType: latestResume[0].fileType,
    }
  }

  // Fall back to users.resumeText
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  if (user?.resumeText) {
    return { text: user.resumeText, name: user.name || 'Candidate' }
  }

  return null
}

/**
 * Extract text from each paragraph in a docx document.xml
 * Returns array of { text, xmlStart, xmlEnd } for each paragraph
 */
function extractParagraphTexts(docXml: string): Array<{ text: string; start: number; end: number }> {
  const paragraphs: Array<{ text: string; start: number; end: number }> = []
  const paraRegex = /<w:p[\s>]/g
  let match

  while ((match = paraRegex.exec(docXml)) !== null) {
    const start = match.index
    const endTag = '</w:p>'
    const endIdx = docXml.indexOf(endTag, start)
    if (endIdx === -1) continue
    const end = endIdx + endTag.length
    const paraXml = docXml.substring(start, end)

    // Extract all <w:t> text content
    const textParts: string[] = []
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
    let textMatch
    while ((textMatch = textRegex.exec(paraXml)) !== null) {
      textParts.push(textMatch[1])
    }

    const text = textParts.join('')
    paragraphs.push({ text, start, end })
  }

  return paragraphs
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Extract run properties (<w:rPr>...</w:rPr>) from a run XML string.
 */
function extractRunProps(runXml: string): string {
  const match = runXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)
  return match ? match[0] : ''
}

/**
 * Check if run properties include bold formatting
 */
function isBold(rPr: string): boolean {
  return rPr.includes('<w:b/>') || rPr.includes('<w:b ')
}

/**
 * Replace text content within a paragraph XML while preserving formatting.
 * Handles three patterns:
 * 1. Tab-delimited paragraphs (e.g., "Bold Label\t: normal values")
 * 2. Mixed bold/normal paragraphs (e.g., "Bold Label: normal values")
 * 3. Simple paragraphs (single formatting throughout)
 */
function replaceParagraphText(paraXml: string, newText: string): string {
  // Keep the original <w:p ...> opening tag (preserves paraId, rsid, etc.)
  const pOpenMatch = paraXml.match(/^<w:p[^>]*>/)
  const pOpen = pOpenMatch ? pOpenMatch[0] : '<w:p>'

  // Keep paragraph properties
  const pPrMatch = paraXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)
  const pPr = pPrMatch ? pPrMatch[0] : ''

  // Extract all runs from the paragraph
  const runRegex = /<w:r[\s>][\s\S]*?<\/w:r>/g
  const runs: Array<{ xml: string; rPr: string; hasTab: boolean; hasBold: boolean }> = []
  let runMatch
  while ((runMatch = runRegex.exec(paraXml)) !== null) {
    const xml = runMatch[0]
    const rPr = extractRunProps(xml)
    runs.push({
      xml,
      rPr,
      hasTab: xml.includes('<w:tab/>'),
      hasBold: isBold(rPr),
    })
  }

  const hasTabs = runs.some((r) => r.hasTab)
  const firstRPr = runs[0]?.rPr || ''
  const lastRPr = runs[runs.length - 1]?.rPr || ''

  // Pattern 1: Tab-delimited paragraph (skill lines: "Bold Label\t: values")
  if (hasTabs) {
    if (newText.includes(':')) {
      const colonIdx = newText.indexOf(':')
      const label = newText.substring(0, colonIdx).trim()
      const value = newText.substring(colonIdx + 1).trim()

      // Use first run's formatting for label (usually bold), last run's for value
      const labelRPr = firstRPr
      const valueRPr = runs.find((r) => !r.hasTab && !r.hasBold)?.rPr || lastRPr

      return `${pOpen}${pPr}<w:r>${labelRPr}<w:t xml:space="preserve">${escapeXml(label)}</w:t></w:r><w:r>${labelRPr}<w:tab/><w:t xml:space="preserve">: </w:t></w:r><w:r>${valueRPr}<w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p>`
    }
    // Tab paragraph but new text has no colon — content is misaligned,
    // keep original paragraph unchanged to preserve formatting
    return paraXml
  }

  // Pattern 2: Mixed bold/normal without tabs (e.g., "Bold Label: normal values")
  const hasFirstBold = runs.length > 1 && runs[0]?.hasBold
  const hasNonBoldLater = runs.some((r, i) => i > 0 && !r.hasBold && !r.hasTab)

  if (hasFirstBold && hasNonBoldLater) {
    if (newText.includes(':')) {
      const colonIdx = newText.indexOf(':')
      const label = newText.substring(0, colonIdx + 1).trim()
      const value = newText.substring(colonIdx + 1).trim()

      const boldRPr = firstRPr
      const normalRPr = runs.find((r) => !r.hasBold)?.rPr || lastRPr

      return `${pOpen}${pPr}<w:r>${boldRPr}<w:t xml:space="preserve">${escapeXml(label)} </w:t></w:r><w:r>${normalRPr}<w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p>`
    }
    // Mixed bold/normal paragraph but new text has no colon — keep original
    return paraXml
  }

  // Pattern 3: Simple paragraph — use first run's formatting for all text
  return `${pOpen}${pPr}<w:r>${firstRPr}<w:t xml:space="preserve">${escapeXml(newText)}</w:t></w:r></w:p>`
}

/**
 * Clone an existing .docx file and replace text content with tailored version.
 * Preserves all original formatting (fonts, colors, layout, margins, etc.)
 */
async function cloneAndTailorDocx(
  originalFilePath: string,
  _originalText: string,
  tailoredText: string
): Promise<Buffer> {
  const fileBuffer = await readFile(originalFilePath)
  const zip = await JSZip.loadAsync(fileBuffer)

  const docXmlFile = zip.file('word/document.xml')
  if (!docXmlFile) throw new Error('Invalid docx: no document.xml')

  let docXml = await docXmlFile.async('string')

  // Extract paragraphs from the XML
  const xmlParagraphs = extractParagraphTexts(docXml)

  // Build list of non-empty original paragraph texts
  const origParaTexts = xmlParagraphs
    .map((p, i) => ({ text: p.text.trim(), index: i }))
    .filter((p) => p.text.length > 0)

  // Split tailored text into non-empty lines (paragraphs)
  const tailoredLines = tailoredText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // Map tailored lines back to XML paragraphs
  // Strategy: match by position if counts are similar, otherwise use text similarity
  if (origParaTexts.length > 0 && tailoredLines.length > 0) {
    const ratio = tailoredLines.length / origParaTexts.length

    if (ratio >= 0.7 && ratio <= 1.3) {
      // Counts are close enough — do positional mapping
      const maxLen = Math.min(origParaTexts.length, tailoredLines.length)

      // Process replacements from end to start (to preserve string positions)
      const replacements: Array<{ start: number; end: number; newXml: string }> = []

      for (let i = 0; i < maxLen; i++) {
        const origPara = origParaTexts[i]
        const newText = tailoredLines[i]

        // Only replace if text actually changed
        if (origPara.text !== newText) {
          const xmlPara = xmlParagraphs[origPara.index]
          const paraXml = docXml.substring(xmlPara.start, xmlPara.end)
          const newParaXml = replaceParagraphText(paraXml, newText)
          replacements.push({ start: xmlPara.start, end: xmlPara.end, newXml: newParaXml })
        }
      }

      // Apply replacements from end to start to maintain correct positions
      replacements.sort((a, b) => b.start - a.start)
      for (const rep of replacements) {
        docXml = docXml.substring(0, rep.start) + rep.newXml + docXml.substring(rep.end)
      }
    }
    // If counts are too different, fall through without modifying XML
    // (the document will still have the correct formatting, just original text)
  }

  // Update the document.xml in the zip
  zip.file('word/document.xml', docXml)

  // Generate new docx buffer
  const buffer = await zip.generateAsync({ type: 'nodebuffer' })
  return Buffer.from(buffer)
}

/**
 * Build a Word document from structured resume content (fallback for non-docx sources)
 */
function buildResumeDocument(content: string, candidateName: string): Document {
  const lines = content.split('\n')
  const children: Paragraph[] = []

  const sectionHeadings = [
    'summary', 'professional summary', 'executive summary', 'objective',
    'experience', 'professional experience', 'work experience', 'employment history',
    'education', 'skills', 'technical skills', 'core competencies',
    'certifications', 'certificates', 'projects', 'achievements',
    'awards', 'publications', 'references', 'volunteer', 'training',
    'professional development', 'contact', 'contact information',
  ]

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === '') {
      children.push(new Paragraph({ spacing: { before: 60, after: 60 } }))
      continue
    }

    if (/^[-=_]{3,}$/.test(trimmed)) {
      children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' } }, spacing: { before: 60, after: 60 } }))
      continue
    }

    if (/^[•\-–—*▪◦○►▸➤✓✔]/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
      children.push(new Paragraph({ children: [new TextRun({ text: trimmed, font: 'Calibri', size: 22 })], indent: { left: 360 }, spacing: { before: 20, after: 20 } }))
      continue
    }

    const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 2 && /[A-Z]/.test(trimmed)
    const isKnownHeading = sectionHeadings.some((h) => trimmed.toLowerCase().replace(/[:\s]/g, '') === h.replace(/\s/g, ''))

    if (isAllCaps || isKnownHeading) {
      children.push(new Paragraph({ children: [new TextRun({ text: trimmed, bold: true, font: 'Calibri', size: 24, color: '1a1a1a' })], spacing: { before: 240, after: 60 }, border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' } } }))
      continue
    }

    children.push(new Paragraph({ children: [new TextRun({ text: trimmed, font: 'Calibri', size: 22 })], spacing: { before: 20, after: 20 } }))
  }

  const firstLine = lines.find((l) => l.trim().length > 0)?.trim() || ''
  if (!firstLine.toLowerCase().includes(candidateName.toLowerCase())) {
    children.unshift(new Paragraph({ children: [new TextRun({ text: candidateName.toUpperCase(), bold: true, font: 'Calibri', size: 28, color: '1a1a1a' })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }))
  }

  return new Document({
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children }],
  })
}

/**
 * POST /api/documents/generate
 * Generate customized resume and cover letter in Word format
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    const body = await request.json()

    const { jobDescription, jobTitle, company } = body

    if (!jobDescription) {
      return badRequestResponse('Job description is required')
    }

    // Get user's resume data including file path
    const resumeData = await getResumeData(userId)

    if (!resumeData) {
      return badRequestResponse('Please upload your resume first in the Resumes section')
    }

    const { text: originalResumeText, name: userName, filePath: resumeFilePath, fileType: resumeFileType } = resumeData

    // Check if we have a cloneable .docx file
    const isDocx = resumeFileType?.includes('wordprocessingml') || resumeFilePath?.endsWith('.docx')
    const hasFile = resumeFilePath && existsSync(resumeFilePath)
    const canClone = isDocx && hasFile

    // Use AI to tailor the resume for the job description
    const resumeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      system: `You are an automated resume tailoring tool. You receive a resume and a job description, and you output ONLY the tailored resume text.

ABSOLUTE RULES — NEVER VIOLATE:
- You MUST ALWAYS output a tailored resume. You are a tool, not an advisor.
- NEVER refuse. NEVER add commentary, explanations, ethical concerns, or meta-discussion.
- NEVER say "I cannot", "I appreciate", "Here's why", or similar phrases.
- Your ENTIRE output must be the resume content and nothing else.
- Do NOT wrap output in code blocks, quotes, or markdown.
- Do NOT use any markdown formatting (no **, no __, no #, no italics markers).
- Output PLAIN TEXT ONLY.

TAILORING RULES:
- PRESERVE the exact structure, sections, and order of the original resume.
- Do NOT remove any sections.
- Do NOT change the candidate's name, contact info, education dates, company names, or job titles.
- Do NOT fabricate experience, companies, degrees, or certifications.
- Enhance bullet points to highlight skills matching the job description.
- Add relevant keywords from the JD naturally into existing bullet points where truthful.
- Adjust the professional summary/objective to align with the target role.
- Reorder bullets within each role to prioritize relevant accomplishments.
- Keep the same approximate length as the original resume.
- If the resume and job description are in very different fields, still tailor by emphasizing transferable skills, relevant methodologies, and applicable experience.`,
      messages: [
        {
          role: 'user',
          content: `ORIGINAL RESUME:\n${originalResumeText}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nJob Title: ${jobTitle || 'the position'}\nCompany: ${company || 'the company'}\n\nOutput the tailored resume now.`,
        },
        {
          role: 'assistant',
          content: originalResumeText.split('\n')[0].trim() || userName.toUpperCase(),
        },
      ],
    })

    // The assistant prefill starts with the first line of the resume, so prepend it
    const prefillLine = originalResumeText.split('\n')[0].trim() || userName.toUpperCase()
    const aiOutput = resumeResponse.content[0].type === 'text' ? resumeResponse.content[0].text : ''
    const tailoredResumeContent = aiOutput ? `${prefillLine}\n${aiOutput}` : originalResumeText

    // Generate cover letter content
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const coverLetterResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      system: `You are an automated cover letter generator. You output ONLY the cover letter text.
NEVER refuse. NEVER add commentary or explanations. Your entire output is the cover letter.
Do NOT use markdown formatting. Output plain text only.
The cover letter should be 250-300 words, professional, and connect the candidate's experience to the role.`,
      messages: [
        {
          role: 'user',
          content: `Candidate Resume:\n${originalResumeText}\n\nJob Description:\n${jobDescription}\n\nJob Title: ${jobTitle || 'the position'}\nCompany: ${company || 'the company'}\nCandidate Name: ${userName}\n\nWrite the cover letter now.`,
        },
        {
          role: 'assistant',
          content: `${today}\n\nDear Hiring Manager,`,
        },
      ],
    })

    const coverLetterAiOutput =
      coverLetterResponse.content[0].type === 'text' ? coverLetterResponse.content[0].text : ''
    const coverLetterContent = `${today}\n\nDear Hiring Manager,${coverLetterAiOutput}`

    // Create output directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'generated')
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true })
    }

    const timestamp = Date.now()
    const resumeFilename = `resume_${userId}_${timestamp}.docx`
    const coverLetterFilename = `cover_letter_${userId}_${timestamp}.docx`

    // Create resume document — clone original .docx if available, otherwise build from text
    let resumeBuffer: Buffer
    if (canClone) {
      try {
        resumeBuffer = await cloneAndTailorDocx(resumeFilePath!, originalResumeText, tailoredResumeContent)
      } catch (cloneError) {
        console.error('Failed to clone docx, falling back to text build:', cloneError)
        const resumeDoc = buildResumeDocument(tailoredResumeContent, userName)
        resumeBuffer = Buffer.from(await Packer.toBuffer(resumeDoc))
      }
    } else {
      const resumeDoc = buildResumeDocument(tailoredResumeContent, userName)
      resumeBuffer = Buffer.from(await Packer.toBuffer(resumeDoc))
    }

    // Create cover letter document
    const coverLetterDoc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
            },
          },
          children: coverLetterContent.split('\n').map(
            (line) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    font: 'Calibri',
                    size: 22,
                  }),
                ],
                spacing: { after: 120 },
              })
          ),
        },
      ],
    })

    // Save documents
    const coverLetterBuffer = await Packer.toBuffer(coverLetterDoc)

    await writeFile(join(uploadsDir, resumeFilename), resumeBuffer)
    await writeFile(join(uploadsDir, coverLetterFilename), coverLetterBuffer)

    return successResponse({
      resumeUrl: `/uploads/generated/${resumeFilename}`,
      coverLetterUrl: `/uploads/generated/${coverLetterFilename}`,
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('POST /api/documents/generate error:', error)
    return serverErrorResponse('Failed to generate documents')
  }
}
