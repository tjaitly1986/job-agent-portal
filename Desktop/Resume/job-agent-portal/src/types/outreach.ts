export type OutreachTone = 'professional' | 'enthusiastic' | 'conversational'

export interface OutreachRecord {
  id: string
  userId: string
  jobDescription: string
  jobTitle: string | null
  company: string | null
  recruiterName: string | null
  prerequisites: string | null
  tone: OutreachTone
  linkedinMessage: string | null
  emailMessage: string | null
  resumeUrl: string | null
  coverLetterUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateOutreachRecordInput {
  jobDescription: string
  jobTitle?: string
  company?: string
  recruiterName?: string
  prerequisites?: string
  tone?: OutreachTone
  linkedinMessage?: string
  emailMessage?: string
  resumeUrl?: string
  coverLetterUrl?: string
}

export interface UpdateOutreachRecordInput {
  linkedinMessage?: string
  emailMessage?: string
  resumeUrl?: string
  coverLetterUrl?: string
}
