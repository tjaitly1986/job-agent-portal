/**
 * Tracker (Application) related TypeScript interfaces
 */

import { Job } from './job'

export type ApplicationStatus =
  | 'saved'
  | 'ready_to_apply'
  | 'applied'
  | 'phone_screen'
  | 'interview'
  | 'technical'
  | 'offer'
  | 'rejected'
  | 'withdrawn'
  | 'expired'

export type ApplicationSource = 'website' | 'email' | 'linkedin' | 'referral' | 'recruiter' | 'other'

export interface OfferDetails {
  salary?: number
  salaryType?: 'hourly' | 'annual'
  startDate?: string
  benefits?: string
  equity?: string
  bonus?: string
  notes?: string
}

export interface JobApplication {
  id: string
  userId: string
  jobId: string
  profileId: string | null
  status: ApplicationStatus
  appliedAt: string | null
  appliedVia: ApplicationSource | null
  resumeId: string | null
  coverLetterId: string | null
  followUpDate: string | null
  notes: string | null
  interviewDates: string[]
  offerDetails: OfferDetails | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  job?: Job
}

export interface CreateApplicationInput {
  jobId: string
  profileId?: string
  status?: ApplicationStatus
  notes?: string
}

export interface UpdateApplicationInput {
  status?: ApplicationStatus
  appliedAt?: string
  appliedVia?: ApplicationSource
  resumeId?: string
  coverLetterId?: string
  followUpDate?: string
  notes?: string
  interviewDates?: string[]
  offerDetails?: OfferDetails
  rejectionReason?: string
}
