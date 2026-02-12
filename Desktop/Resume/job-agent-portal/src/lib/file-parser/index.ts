import { parsePDF, parsePDFBuffer } from './pdf-parser'
import { parseDOCX, parseDOCXBuffer } from './docx-parser'

/**
 * Parse resume file and extract text
 * @param filePath - Absolute path to file
 * @param fileType - File MIME type
 * @returns Extracted text content
 */
export async function parseResume(filePath: string, fileType: string): Promise<string> {
  if (fileType === 'application/pdf') {
    return parsePDF(filePath)
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return parseDOCX(filePath)
  } else if (fileType === 'application/msword') {
    // Old DOC format - not supported by mammoth, return error message
    throw new Error('Old .doc format is not supported. Please upload .docx or PDF')
  } else {
    throw new Error(`Unsupported file type: ${fileType}`)
  }
}

/**
 * Parse resume from buffer
 * @param buffer - File buffer
 * @param fileType - File MIME type
 * @returns Extracted text content
 */
export async function parseResumeBuffer(buffer: Buffer, fileType: string): Promise<string> {
  if (fileType === 'application/pdf') {
    return parsePDFBuffer(buffer)
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return parseDOCXBuffer(buffer)
  } else if (fileType === 'application/msword') {
    throw new Error('Old .doc format is not supported. Please upload .docx or PDF')
  } else {
    throw new Error(`Unsupported file type: ${fileType}`)
  }
}

export { parsePDF, parsePDFBuffer } from './pdf-parser'
export { parseDOCX, parseDOCXBuffer } from './docx-parser'
