import { NextRequest } from 'next/server'

// Two Claude API calls (resume + cover letter) can take 60-90s total
export const maxDuration = 180
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
  timeout: 300_000, // 5 minutes — resume tailoring calls can take 30-60s
  maxRetries: 3, // retry on transient connection errors
})

interface ResumeData {
  text: string
  name: string
  filePath?: string
  fileType?: string
}

interface ResumeEdits {
  summary: Array<{ originalText: string; newText: string }>
  skills: Array<{ label: string; newValues: string }>
  experience: Array<{ originalText: string; newText: string }>
  remove: Array<{ originalText: string }>
}

/**
 * Get the user's resume text and file info from the resumes table,
 * falling back to users.resumeText if no uploads exist
 */
async function getResumeData(userId: string, resumeId?: string): Promise<ResumeData | null> {
  // If a specific resume ID is provided, use that one directly
  if (resumeId) {
    const specificResume = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
      .limit(1)

    if (specificResume[0]?.parsedText) {
      const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId))
      return {
        text: specificResume[0].parsedText,
        name: user?.name || 'Candidate',
        filePath: specificResume[0].filePath,
        fileType: specificResume[0].fileType,
      }
    }
  }

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
 * Remove bold formatting from run properties XML
 */
function stripBold(rPr: string): string {
  return rPr
    .replace(/<w:b\/>/g, '')
    .replace(/<w:b [^/]*\/>/g, '')
    .replace(/<w:b>[\s\S]*?<\/w:b>/g, '')
}

/**
 * Check if text looks like a section heading (not body/bullet text)
 */
function isHeadingText(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length === 0) return false
  // All caps and short = heading
  if (trimmed === trimmed.toUpperCase() && trimmed.length < 80 && /[A-Z]/.test(trimmed)) return true
  // Known section headings
  const headings = [
    'summary', 'experience', 'education', 'skills', 'technical skills',
    'certifications', 'projects', 'achievements', 'professional experience',
    'work experience', 'core competencies', 'professional summary',
    'executive summary', 'contact', 'contact information', 'references',
  ]
  const normalized = trimmed.toLowerCase().replace(/[:\s]/g, '')
  if (headings.some((h) => normalized === h.replace(/\s/g, ''))) return true
  // Sub-headings: short text ending with colon, no commas (not a skill line)
  if (trimmed.endsWith(':') && trimmed.length < 70 && !trimmed.includes(',') && /^[A-Z]/.test(trimmed)) return true
  // Client/Role lines in experience sections
  if (/^(Client|Role|Description):/.test(trimmed)) return true
  return false
}

// ─── JSON Edits Parsing ────────────────────────────────────────────────

/**
 * Attempt to repair malformed JSON from the AI.
 * Handles common issues: trailing content after closing brace, unclosed strings,
 * truncated arrays/objects, markdown code fences.
 */
function repairJson(raw: string): string {
  let s = raw.trim()

  // Strip markdown code fences if present
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')

  // Find the outermost matching closing brace for the opening '{'
  let depth = 0
  let inString = false
  let escape = false
  let lastClosingBrace = -1

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{' || ch === '[') depth++
    if (ch === '}' || ch === ']') {
      depth--
      if (ch === '}') lastClosingBrace = i
      if (depth === 0) {
        // Truncate anything after the balanced closing brace
        return s.substring(0, i + 1)
      }
    }
  }

  // If we get here, the JSON is unclosed — try to close it
  if (lastClosingBrace > 0) {
    // Truncate at the last valid closing brace and close remaining open brackets
    s = s.substring(0, lastClosingBrace + 1)
  }

  // Close any remaining open structures
  // Remove any trailing partial string/value (after last comma or colon)
  s = s.replace(/,\s*"[^"]*$/, '')  // trailing partial key
  s = s.replace(/:\s*"[^"]*$/, ': ""')  // trailing partial string value
  s = s.replace(/,\s*$/, '')  // trailing comma

  // Count remaining unclosed brackets
  depth = 0
  let arrayDepth = 0
  inString = false
  escape = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    if (ch === '}') depth--
    if (ch === '[') arrayDepth++
    if (ch === ']') arrayDepth--
  }

  // Close unclosed arrays then objects
  while (arrayDepth > 0) { s += ']'; arrayDepth-- }
  while (depth > 0) { s += '}'; depth-- }

  return s
}

/**
 * Parse and validate the AI's JSON edits response.
 * Returns null on parse failure or if no actual edits were found.
 */
function parseResumeEdits(jsonStr: string): ResumeEdits | null {
  try {
    // Try direct parse first, then repair if it fails
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      console.warn('[parseEdits] Direct JSON.parse failed, attempting repair...')
      const repaired = repairJson(jsonStr)
      parsed = JSON.parse(repaired)
      console.log('[parseEdits] JSON repair succeeded')
    }

    const edits: ResumeEdits = {
      summary: [],
      skills: [],
      experience: [],
      remove: [],
    }

    if (Array.isArray(parsed.summary)) {
      edits.summary = parsed.summary.filter(
        (e: Record<string, unknown>) =>
          typeof e.originalText === 'string' &&
          typeof e.newText === 'string' &&
          e.originalText !== e.newText
      )
    }
    if (Array.isArray(parsed.skills)) {
      edits.skills = parsed.skills.filter(
        (e: Record<string, unknown>) =>
          typeof e.label === 'string' &&
          typeof e.newValues === 'string'
      )
    }
    if (Array.isArray(parsed.experience)) {
      edits.experience = parsed.experience.filter(
        (e: Record<string, unknown>) =>
          typeof e.originalText === 'string' &&
          typeof e.newText === 'string' &&
          e.originalText !== e.newText
      )
    }
    if (Array.isArray(parsed.remove)) {
      edits.remove = parsed.remove.filter(
        (e: Record<string, unknown>) =>
          typeof e.originalText === 'string' &&
          e.originalText.length > 0
      )
    }

    const totalEdits = edits.summary.length + edits.skills.length + edits.experience.length + edits.remove.length
    if (totalEdits === 0) return null

    console.log(`[parseEdits] Found ${edits.summary.length} summary, ${edits.skills.length} skill, ${edits.experience.length} experience, ${edits.remove.length} removal edits`)
    return edits
  } catch (err) {
    console.error('[parseEdits] Failed to parse JSON even after repair:', err)
    return null
  }
}

// ─── Content-Based Paragraph Finders ────────────────────────────────────

/**
 * Find a paragraph by its text content using 3-tier matching:
 * 1. Exact normalized match (lowercase, whitespace-collapsed)
 * 2. Substring containment (target in paragraph or vice versa)
 * 3. Jaccard similarity on significant words (threshold > 0.6)
 *
 * Takes a Set of already-used indices to prevent double-matching.
 */
function findParagraphByText(
  target: string,
  paragraphs: Array<{ text: string; start: number; end: number }>,
  usedIndices: Set<number>
): number {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const normalTarget = normalize(target)
  if (normalTarget.length === 0) return -1

  // Tier 1: Exact normalized match
  for (let i = 0; i < paragraphs.length; i++) {
    if (usedIndices.has(i)) continue
    if (normalize(paragraphs[i].text) === normalTarget) return i
  }

  // Tier 2: Substring containment
  for (let i = 0; i < paragraphs.length; i++) {
    if (usedIndices.has(i)) continue
    const normalPara = normalize(paragraphs[i].text)
    if (normalPara.length === 0) continue
    if (normalPara.includes(normalTarget) || normalTarget.includes(normalPara)) return i
  }

  // Tier 3: Jaccard similarity on significant words
  const targetWords = new Set(normalTarget.split(' ').filter((w) => w.length > 2))
  if (targetWords.size === 0) return -1

  let bestIdx = -1
  let bestScore = 0.6 // minimum threshold

  for (let i = 0; i < paragraphs.length; i++) {
    if (usedIndices.has(i)) continue
    const paraWords = new Set(normalize(paragraphs[i].text).split(' ').filter((w) => w.length > 2))
    if (paraWords.size === 0) continue

    let intersection = 0
    for (const w of targetWords) {
      if (paraWords.has(w)) intersection++
    }
    const union = new Set([...targetWords, ...paraWords]).size
    const jaccard = intersection / union

    if (jaccard > bestScore) {
      bestScore = jaccard
      bestIdx = i
    }
  }

  return bestIdx
}

/**
 * Find a skill paragraph by matching the label text before the colon.
 * Exact match first, then fuzzy substring match.
 */
function findSkillParagraphByLabel(
  label: string,
  paragraphs: Array<{ text: string; start: number; end: number }>,
  usedIndices: Set<number>
): number {
  const normalLabel = label.toLowerCase().trim()

  // Exact match on text before colon
  for (let i = 0; i < paragraphs.length; i++) {
    if (usedIndices.has(i)) continue
    const text = paragraphs[i].text
    const colonIdx = text.indexOf(':')
    if (colonIdx === -1) continue
    const paraLabel = text.substring(0, colonIdx).trim().toLowerCase()
    if (paraLabel === normalLabel) return i
  }

  // Fuzzy substring match
  for (let i = 0; i < paragraphs.length; i++) {
    if (usedIndices.has(i)) continue
    const text = paragraphs[i].text
    const colonIdx = text.indexOf(':')
    if (colonIdx === -1) continue
    const paraLabel = text.substring(0, colonIdx).trim().toLowerCase()
    if (paraLabel.includes(normalLabel) || normalLabel.includes(paraLabel)) return i
  }

  return -1
}

// ─── Surgical Paragraph Replacement Functions ────────────────────────────

/**
 * Replace ONLY the value text in a skill paragraph (after the colon/tab).
 * Keeps label run, tab run, colon run untouched.
 * Strips bold from value text — only labels should be bold.
 * Prepends a space before values to maintain "Label\t: values" spacing.
 */
function replaceSkillValue(paraXml: string, newValues: string): string {
  // Parse all runs from the paragraph
  const runRegex = /<w:r[\s>][\s\S]*?<\/w:r>/g
  const runs: Array<{ xml: string; start: number; end: number; hasTab: boolean; text: string; rPr: string }> = []
  let m
  while ((m = runRegex.exec(paraXml)) !== null) {
    const xml = m[0]
    const textMatch = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/)
    runs.push({
      xml,
      start: m.index,
      end: m.index + xml.length,
      hasTab: xml.includes('<w:tab/>'),
      text: textMatch ? textMatch[1] : '',
      rPr: extractRunProps(xml),
    })
  }
  if (runs.length === 0) return paraXml

  // Find the run containing the colon
  let colonRunIdx = -1
  for (let i = 0; i < runs.length; i++) {
    if (runs[i].text.includes(':')) {
      colonRunIdx = i
      break
    }
  }
  if (colonRunIdx === -1) return paraXml

  // Collect ALL runs after the colon run (excluding tab-only runs) — these are value + spacer runs
  const afterColonRuns: typeof runs = []
  for (let i = colonRunIdx + 1; i < runs.length; i++) {
    if (!runs[i].hasTab) {
      afterColonRuns.push(runs[i])
    }
  }

  if (afterColonRuns.length === 0) {
    // Edge case: colon and values might be in the same run
    const colonRun = runs[colonRunIdx]
    const colonPos = colonRun.text.indexOf(':')
    const afterColon = colonRun.text.substring(colonPos + 1).trim()
    if (afterColon.length > 0) {
      const keepPrefix = colonRun.text.substring(0, colonPos + 1) + ' '
      const valRPr = stripBold(colonRun.rPr)
      const newRunXml = `<w:r>${valRPr}<w:t xml:space="preserve">${escapeXml(keepPrefix + newValues)}</w:t></w:r>`
      return paraXml.substring(0, colonRun.start) + newRunXml + paraXml.substring(colonRun.end)
    }
    return paraXml
  }

  // Find the best rPr for value text: use the first NON-bold run after the colon,
  // falling back to stripping bold from whatever we have
  let valueRPr = ''
  for (const run of afterColonRuns) {
    if (!isBold(run.rPr) && run.text.trim().length > 0) {
      valueRPr = run.rPr
      break
    }
  }
  if (!valueRPr) {
    // All value runs are bold — strip bold from the first one
    valueRPr = stripBold(afterColonRuns[0].rPr)
  }

  // Check if the colon run already ends with a space (e.g., ": ") to avoid double spacing
  const colonText = runs[colonRunIdx].text
  const colonEndsWithSpace = colonText.endsWith(' ') || colonText.endsWith(':\u00A0')
  const prefix = colonEndsWithSpace ? '' : ' '

  // Build replacement run: conditionally add leading space, always non-bold
  const newRunXml = `<w:r>${valueRPr}<w:t xml:space="preserve">${prefix}${escapeXml(newValues)}</w:t></w:r>`

  let result = paraXml

  // Remove ALL runs after colon (from end to start to preserve positions)
  for (let i = afterColonRuns.length - 1; i >= 0; i--) {
    result = result.substring(0, afterColonRuns[i].start) + result.substring(afterColonRuns[i].end)
  }

  // Insert new value run at the position of the first removed run
  const insertPos = afterColonRuns[0].start
  result = result.substring(0, insertPos) + newRunXml + result.substring(insertPos)

  return result
}

/**
 * Replace text in a bullet/summary paragraph while preserving formatting.
 * Keeps <w:pPr> (including bullet/numbering info) and first run's <w:rPr>,
 * but strips bold — body text should never be bold.
 */
function replaceBulletText(paraXml: string, newText: string): string {
  // Keep the original <w:p ...> opening tag (preserves paraId, rsid, etc.)
  const pOpenMatch = paraXml.match(/^<w:p[^>]*>/)
  const pOpen = pOpenMatch ? pOpenMatch[0] : '<w:p>'

  // Keep paragraph properties (includes bullet/numbering, indentation, spacing)
  const pPrMatch = paraXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)
  const pPr = pPrMatch ? pPrMatch[0] : ''

  // Get first run's formatting properties, strip bold
  const firstRunMatch = paraXml.match(/<w:r[\s>][\s\S]*?<\/w:r>/)
  let rPr = ''
  if (firstRunMatch) {
    rPr = stripBold(extractRunProps(firstRunMatch[0]))
  }

  return `${pOpen}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(newText)}</w:t></w:r></w:p>`
}

// ─── Document Cloning (Content-Based) ────────────────────────────────────

/**
 * Clone an existing .docx file and apply targeted edits by finding paragraphs
 * by their text content (not position). Only text changes; formatting, structure,
 * and paragraph count are preserved exactly.
 */
async function cloneAndTailorDocx(
  originalFilePath: string,
  edits: ResumeEdits
): Promise<Buffer> {
  const fileBuffer = await readFile(originalFilePath)
  const zip = await JSZip.loadAsync(fileBuffer)

  const docXmlFile = zip.file('word/document.xml')
  if (!docXmlFile) throw new Error('Invalid docx: no document.xml')

  let docXml = await docXmlFile.async('string')
  const xmlParagraphs = extractParagraphTexts(docXml)

  const usedIndices = new Set<number>()
  const replacements: Array<{ start: number; end: number; newXml: string }> = []

  // 1. Apply skill edits (find by label, replace value only)
  for (const edit of edits.skills) {
    const idx = findSkillParagraphByLabel(edit.label, xmlParagraphs, usedIndices)
    if (idx === -1) {
      console.warn(`[skill-edit] No paragraph found for label: "${edit.label}"`)
      continue
    }
    usedIndices.add(idx)
    const paraXml = docXml.substring(xmlParagraphs[idx].start, xmlParagraphs[idx].end)
    const newXml = replaceSkillValue(paraXml, edit.newValues)
    replacements.push({ start: xmlParagraphs[idx].start, end: xmlParagraphs[idx].end, newXml })
    console.log(`[skill-edit] Matched "${edit.label}" → paragraph ${idx}`)

    // Blank continuation paragraphs: the original doc may split long skill values
    // across multiple paragraphs (indented, no colon). Since we now put all values
    // in the main paragraph, blank these to avoid duplicate content.
    for (let ci = idx + 1; ci < xmlParagraphs.length; ci++) {
      const contText = xmlParagraphs[ci].text.trim()
      if (contText.length === 0) continue // skip empty paragraphs
      if (contText.includes(':') || isHeadingText(contText)) break // next skill or section
      const contXml = docXml.substring(xmlParagraphs[ci].start, xmlParagraphs[ci].end)
      if (!contXml.includes('<w:ind ')) break // not indented = not a continuation
      // This is a continuation paragraph — remove it entirely to avoid blank lines
      replacements.push({ start: xmlParagraphs[ci].start, end: xmlParagraphs[ci].end, newXml: '' })
      usedIndices.add(ci)
      console.log(`[skill-edit] Blanked continuation paragraph ${ci}: "${contText.substring(0, 50)}..."`)
    }
  }

  // 2. Apply summary edits (find by text content, replace text)
  for (const edit of edits.summary) {
    const idx = findParagraphByText(edit.originalText, xmlParagraphs, usedIndices)
    if (idx === -1) {
      console.warn(`[summary-edit] No match for: "${edit.originalText.substring(0, 60)}..."`)
      continue
    }
    usedIndices.add(idx)
    const paraXml = docXml.substring(xmlParagraphs[idx].start, xmlParagraphs[idx].end)
    const newXml = replaceBulletText(paraXml, edit.newText)
    replacements.push({ start: xmlParagraphs[idx].start, end: xmlParagraphs[idx].end, newXml })
    console.log(`[summary-edit] Matched paragraph ${idx}`)
  }

  // 3. Apply experience edits (find by text content, skip header lines)
  for (const edit of edits.experience) {
    if (isHeadingText(edit.originalText)) continue
    const idx = findParagraphByText(edit.originalText, xmlParagraphs, usedIndices)
    if (idx === -1) {
      console.warn(`[exp-edit] No match for: "${edit.originalText.substring(0, 60)}..."`)
      continue
    }
    usedIndices.add(idx)
    const paraXml = docXml.substring(xmlParagraphs[idx].start, xmlParagraphs[idx].end)
    const newXml = replaceBulletText(paraXml, edit.newText)
    replacements.push({ start: xmlParagraphs[idx].start, end: xmlParagraphs[idx].end, newXml })
    console.log(`[exp-edit] Matched paragraph ${idx}`)
  }

  // 4. Apply removals (find by text content, remove entire paragraph)
  for (const edit of edits.remove) {
    const idx = findParagraphByText(edit.originalText, xmlParagraphs, usedIndices)
    if (idx === -1) {
      console.warn(`[remove] No match for: "${edit.originalText.substring(0, 60)}..."`)
      continue
    }
    usedIndices.add(idx)
    replacements.push({ start: xmlParagraphs[idx].start, end: xmlParagraphs[idx].end, newXml: '' })
    console.log(`[remove] Removed paragraph ${idx}: "${xmlParagraphs[idx].text.substring(0, 60)}..."`)
  }

  console.log(`[clone] Applying ${replacements.length} edits to document`)

  // Apply replacements from end to start to maintain correct positions
  replacements.sort((a, b) => b.start - a.start)
  for (const rep of replacements) {
    docXml = docXml.substring(0, rep.start) + rep.newXml + docXml.substring(rep.end)
  }

  // Update the document.xml in the zip
  zip.file('word/document.xml', docXml)

  // Generate new docx buffer with DEFLATE compression to keep file size small
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
  return Buffer.from(buffer)
}

// ─── Plain-Text Fallback ─────────────────────────────────────────────────

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Apply the JSON edits to plain text (for users without a .docx file).
 * Returns modified text that can be passed to buildResumeDocument().
 */
function applyEditsToPlainText(originalText: string, edits: ResumeEdits): string {
  let text = originalText

  // Apply summary edits
  for (const edit of edits.summary) {
    text = text.replace(edit.originalText, edit.newText)
  }

  // Apply skill edits (replace values after the label colon)
  for (const edit of edits.skills) {
    const regex = new RegExp(`(${escapeRegex(edit.label)}\\s*:\\s*)(.+)`, 'i')
    text = text.replace(regex, `$1${edit.newValues}`)
  }

  // Apply experience edits
  for (const edit of edits.experience) {
    text = text.replace(edit.originalText, edit.newText)
  }

  // Apply removals (delete matching lines)
  for (const edit of edits.remove) {
    text = text.replace(edit.originalText, '')
  }

  // Clean up any double blank lines left by removals
  text = text.replace(/\n{3,}/g, '\n\n')

  return text
}

// ─── Document Builder (Non-DOCX Fallback) ────────────────────────────────

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

    const { jobDescription, jobTitle, company, resumeId } = body

    if (!jobDescription) {
      return badRequestResponse('Job description is required')
    }

    // Get user's resume data including file path
    const resumeData = await getResumeData(userId, resumeId)

    if (!resumeData) {
      return badRequestResponse('Please upload your resume first in the Resumes section')
    }

    const { text: originalResumeText, name: userName, filePath: resumeFilePath, fileType: resumeFileType } = resumeData

    // Check if we have a cloneable .docx file
    const isDocx = resumeFileType?.includes('wordprocessingml') || resumeFilePath?.endsWith('.docx')
    const hasFile = resumeFilePath && existsSync(resumeFilePath)
    const canClone = isDocx && hasFile

    // Run resume edits + cover letter generation in PARALLEL to halve total time
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const resumePromise = anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      system: `You are an automated resume tailoring tool. You receive a resume and a job description, and output a JSON object with SPECIFIC EDITS to make to the resume.

OUTPUT FORMAT — Return a single JSON object with these arrays:
{
  "summary": [
    { "originalText": "exact original bullet text", "newText": "improved version" }
  ],
  "skills": [
    { "label": "Skill Category Name", "newValues": "updated, comma, separated, values" }
  ],
  "experience": [
    { "originalText": "exact original bullet text", "newText": "improved version" }
  ],
  "remove": [
    { "originalText": "exact text of paragraph to remove" }
  ]
}

CRITICAL RULES:
- Use the EXACT original text for "originalText" fields — this is used to FIND the paragraph in the document.
- Only include items that ACTUALLY CHANGE. If a bullet is already perfect, omit it.
- Do NOT include section headings (SUMMARY, EXPERIENCE, EDUCATION, TECHNICAL SKILLS, etc.)
- Do NOT include Client/Role/Description/Environment header lines.
- Do NOT add new bullets or sections — only modify existing ones.
- For skills: "label" is the text before the colon (e.g., "Integration & Middleware"). "newValues" is the new comma-separated list AFTER the colon.
- Do NOT fabricate experience, companies, degrees, or certifications.
- Enhance bullet points to highlight skills matching the job description.
- Add relevant keywords from the JD naturally where truthful.

REMOVING IRRELEVANT CONTENT:
- Use the "remove" array to delete paragraphs that waste space and are NOT relevant to the target role.
- REMOVE company/client description lines (e.g., "SPS Commerce is a leading cloud-based supply chain..." or "Description: Fenwick Software is a..."). These describe the employer, not the candidate.
- REMOVE "Key Achievements" sub-headings and their bullet points from past/older roles. Only keep key achievements for the most recent or most relevant role if directly applicable to the target job.
- REMOVE bullet points that are clearly irrelevant to the target job description and add no value.
- Do NOT remove job titles, dates, company names, role headers, or main section headings (SUMMARY, EXPERIENCE, etc.).
- Be selective — only remove content that genuinely wastes space. Keep bullets that can be reworded to be relevant (put those in "experience" edits instead).

PROFILE SUMMARY:
- The profile summary should be concise and impactful — trim it to 4-5 of the STRONGEST bullet points most relevant to the target role.
- Remove weaker, redundant, or generic summary bullets that don't differentiate the candidate. Put these in the "remove" array.
- Reword the kept bullets (via "summary" edits) to be tightly aligned with the job description.
- Output ONLY valid JSON. No markdown, no code blocks, no commentary.`,
      messages: [
        {
          role: 'user',
          content: `ORIGINAL RESUME:\n${originalResumeText}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nJob Title: ${jobTitle || 'the position'}\nCompany: ${company || 'the company'}\n\nReturn the JSON edits object now.`,
        },
        {
          role: 'assistant',
          content: '{',
        },
      ],
    })

    const coverLetterPromise = anthropic.messages.create({
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

    // Await both in parallel — if one fails, we still get the other via allSettled
    const [resumeResult, coverLetterResult] = await Promise.allSettled([resumePromise, coverLetterPromise])

    // Parse resume edits (prepend the '{' prefill)
    let edits: ResumeEdits | null = null
    if (resumeResult.status === 'fulfilled') {
      const aiOutput = resumeResult.value.content[0].type === 'text' ? resumeResult.value.content[0].text : ''
      const editsJson = '{' + aiOutput
      edits = parseResumeEdits(editsJson)
    } else {
      console.error('[generate] Resume edits API call failed:', resumeResult.reason)
    }

    // Parse cover letter
    let coverLetterContent = ''
    if (coverLetterResult.status === 'fulfilled') {
      const coverLetterAiOutput =
        coverLetterResult.value.content[0].type === 'text' ? coverLetterResult.value.content[0].text : ''
      coverLetterContent = `${today}\n\nDear Hiring Manager,${coverLetterAiOutput}`
    } else {
      console.error('[generate] Cover letter API call failed:', coverLetterResult.reason)
    }

    // If both API calls failed, throw an error
    if (resumeResult.status === 'rejected' && coverLetterResult.status === 'rejected') {
      throw resumeResult.reason
    }

    // Create output directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'generated')
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true })
    }

    const timestamp = Date.now()
    const resumeFilename = `resume_${userId}_${timestamp}.docx`
    const coverLetterFilename = `cover_letter_${userId}_${timestamp}.docx`

    // Create resume document
    let resumeBuffer: Buffer
    if (canClone && edits) {
      // Best path: clone original .docx and apply surgical edits
      try {
        resumeBuffer = await cloneAndTailorDocx(resumeFilePath!, edits)
      } catch (cloneError) {
        console.error('Failed to clone docx, falling back to original:', cloneError)
        // Fallback: return the original document unchanged
        resumeBuffer = await readFile(resumeFilePath!)
      }
    } else if (!canClone && edits) {
      // No .docx file but have edits: apply to plain text, then build document
      const tailoredText = applyEditsToPlainText(originalResumeText, edits)
      const resumeDoc = buildResumeDocument(tailoredText, userName)
      resumeBuffer = Buffer.from(await Packer.toBuffer(resumeDoc))
    } else if (canClone) {
      // Have .docx but no valid edits: return original unchanged
      console.warn('[generate] No valid edits parsed, returning original document')
      resumeBuffer = await readFile(resumeFilePath!)
    } else {
      // No .docx and no edits: build from original text
      const resumeDoc = buildResumeDocument(originalResumeText, userName)
      resumeBuffer = Buffer.from(await Packer.toBuffer(resumeDoc))
    }

    // Save resume
    await writeFile(join(uploadsDir, resumeFilename), resumeBuffer)

    // Create and save cover letter document (if cover letter was generated)
    let coverLetterSavedUrl: string | undefined
    if (coverLetterContent) {
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

      const coverLetterBuffer = await Packer.toBuffer(coverLetterDoc)
      await writeFile(join(uploadsDir, coverLetterFilename), coverLetterBuffer)
      coverLetterSavedUrl = `/uploads/generated/${coverLetterFilename}`
    }

    return successResponse({
      resumeUrl: `/uploads/generated/${resumeFilename}`,
      coverLetterUrl: coverLetterSavedUrl || `/uploads/generated/${coverLetterFilename}`,
    })
  } catch (error) {
    // Write error details to file for debugging (all error types)
    try {
      let errMsg = ''
      if (error instanceof Response) {
        const clone = error.clone()
        const body = await clone.text()
        errMsg = `Response error: status=${error.status} body=${body}`
      } else if (error instanceof Error) {
        errMsg = `${error.message}\n${error.stack}`
      } else {
        errMsg = String(error)
      }
      await writeFile(join(process.cwd(), 'public', 'uploads', 'generated', '_error_log.txt'), `${new Date().toISOString()}\n${errMsg}`)
    } catch {}

    if (error instanceof Response) {
      return error
    }
    console.error('POST /api/documents/generate error:', error)
    return serverErrorResponse('Failed to generate documents')
  }
}
