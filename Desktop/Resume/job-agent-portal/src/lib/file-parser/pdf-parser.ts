import pdf from 'pdf-parse'
import fs from 'fs/promises'

/**
 * Extract text from PDF file
 * @param filePath - Absolute path to PDF file
 * @returns Extracted text content
 */
export async function parsePDF(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath)
    const data = await pdf(dataBuffer)
    return data.text
  } catch (error) {
    console.error('Error parsing PDF:', error)
    throw new Error('Failed to parse PDF file')
  }
}

/**
 * Extract text from PDF buffer (for direct upload processing)
 * @param buffer - PDF file buffer
 * @returns Extracted text content
 */
export async function parsePDFBuffer(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer)
    return data.text
  } catch (error) {
    console.error('Error parsing PDF buffer:', error)
    throw new Error('Failed to parse PDF file')
  }
}
