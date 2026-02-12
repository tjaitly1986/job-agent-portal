import mammoth from 'mammoth'
import fs from 'fs/promises'

/**
 * Extract text from DOCX file
 * @param filePath - Absolute path to DOCX file
 * @returns Extracted text content
 */
export async function parseDOCX(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath)
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (error) {
    console.error('Error parsing DOCX:', error)
    throw new Error('Failed to parse DOCX file')
  }
}

/**
 * Extract text from DOCX buffer (for direct upload processing)
 * @param buffer - DOCX file buffer
 * @returns Extracted text content
 */
export async function parseDOCXBuffer(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (error) {
    console.error('Error parsing DOCX buffer:', error)
    throw new Error('Failed to parse DOCX file')
  }
}
