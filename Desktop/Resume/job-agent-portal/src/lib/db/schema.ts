import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { relations } from 'drizzle-orm'

// ============================================================================
// USERS & AUTHENTICATION
// ============================================================================

export const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  image: text('image'),
  phone: text('phone'),
  linkedinUrl: text('linkedin_url'),
  location: text('location'),
  resumeText: text('resume_text'),
  preferences: text('preferences').default('{}'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
})

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionToken: text('session_token').notNull().unique(),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
  },
  (table) => ({
    tokenIdx: index('idx_sessions_token').on(table.sessionToken),
    userIdx: index('idx_sessions_user').on(table.userId),
  })
)

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    expiresAt: integer('expires_at'),
    tokenType: text('token_type'),
    scope: text('scope'),
  },
  (table) => ({
    userIdx: index('idx_accounts_user').on(table.userId),
    providerIdx: uniqueIndex('idx_accounts_provider').on(table.provider, table.providerAccountId),
  })
)

// ============================================================================
// SEARCH PROFILES
// ============================================================================

export const searchProfiles = sqliteTable(
  'search_profiles',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    jobTitles: text('job_titles').notNull(),
    skills: text('skills').default('[]'),
    locations: text('locations').default('["United States"]'),
    isRemote: integer('is_remote', { mode: 'boolean' }).default(true),
    employmentTypes: text('employment_types').default('["contract", "c2c"]'),
    minSalary: integer('min_salary'),
    maxSalary: integer('max_salary'),
    salaryType: text('salary_type').default('hourly'),
    excludeKeywords: text('exclude_keywords').default('[]'),
    includeKeywords: text('include_keywords').default('[]'),
    platforms: text('platforms').default(
      '["indeed","dice","glassdoor","ziprecruiter","linkedin"]'
    ),
    domain: text('domain'),
    notes: text('notes'),
    lastSearched: text('last_searched'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
  },
  (table) => ({
    userIdx: index('idx_profiles_user').on(table.userId),
    activeIdx: index('idx_profiles_active').on(table.isActive),
  })
)

// ============================================================================
// JOBS
// ============================================================================

export const jobs = sqliteTable(
  'jobs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    externalId: text('external_id'),
    platform: text('platform').notNull(),
    dedupHash: text('dedup_hash').notNull(),
    title: text('title').notNull(),
    company: text('company').notNull(),
    location: text('location').notNull(),
    isRemote: integer('is_remote', { mode: 'boolean' }).default(false),
    salaryText: text('salary_text'),
    salaryMin: real('salary_min'),
    salaryMax: real('salary_max'),
    salaryType: text('salary_type'),
    employmentType: text('employment_type'),
    description: text('description'),
    descriptionHtml: text('description_html'),
    requirements: text('requirements'),
    postedAt: text('posted_at').notNull(),
    postedAtRaw: text('posted_at_raw'),
    applyUrl: text('apply_url').notNull(),
    sourceUrl: text('source_url'),
    isExpired: integer('is_expired', { mode: 'boolean' }).default(false),
    scrapedAt: text('scraped_at').default(sql`(datetime('now'))`),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
  },
  (table) => ({
    dedupIdx: uniqueIndex('idx_jobs_dedup').on(table.dedupHash),
    platformIdx: index('idx_jobs_platform').on(table.platform),
    postedIdx: index('idx_jobs_posted').on(table.postedAt),
    companyIdx: index('idx_jobs_company').on(table.company),
    locationIdx: index('idx_jobs_location').on(table.location),
    remoteIdx: index('idx_jobs_remote').on(table.isRemote),
    titleIdx: index('idx_jobs_title').on(table.title),
  })
)

export const recruiterContacts = sqliteTable(
  'recruiter_contacts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    name: text('name'),
    email: text('email'),
    phone: text('phone'),
    linkedinUrl: text('linkedin_url'),
    company: text('company'),
    title: text('title'),
    source: text('source'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
  },
  (table) => ({
    jobIdx: index('idx_recruiter_job').on(table.jobId),
    emailIdx: index('idx_recruiter_email').on(table.email),
    nameIdx: index('idx_recruiter_name').on(table.name),
  })
)

export const profileJobMatches = sqliteTable(
  'profile_job_matches',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    profileId: text('profile_id')
      .notNull()
      .references(() => searchProfiles.id, { onDelete: 'cascade' }),
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    matchScore: real('match_score').default(0.0),
    matchReasons: text('match_reasons').default('[]'),
    isDismissed: integer('is_dismissed', { mode: 'boolean' }).default(false),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
  },
  (table) => ({
    profileIdx: index('idx_matches_profile').on(table.profileId),
    jobIdx: index('idx_matches_job').on(table.jobId),
    scoreIdx: index('idx_matches_score').on(table.matchScore),
    uniqueMatch: uniqueIndex('idx_matches_unique').on(table.profileId, table.jobId),
  })
)

// ============================================================================
// APPLICATION TRACKING
// ============================================================================

export const resumes = sqliteTable(
  'resumes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    filePath: text('file_path').notNull(),
    fileType: text('file_type').notNull(),
    fileSize: integer('file_size').notNull(),
    parsedText: text('parsed_text'),
    isDefault: integer('is_default', { mode: 'boolean' }).default(false),
    label: text('label'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
  },
  (table) => ({
    userIdx: index('idx_resumes_user').on(table.userId),
  })
)

export const coverLetters = sqliteTable(
  'cover_letters',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    filePath: text('file_path').notNull(),
    fileType: text('file_type').notNull(),
    fileSize: integer('file_size').notNull(),
    parsedText: text('parsed_text'),
    label: text('label'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
  },
  (table) => ({
    userIdx: index('idx_coverletters_user').on(table.userId),
  })
)

export const jobApplications = sqliteTable(
  'job_applications',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    profileId: text('profile_id').references(() => searchProfiles.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('saved'),
    appliedAt: text('applied_at'),
    appliedVia: text('applied_via'),
    resumeId: text('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
    coverLetterId: text('cover_letter_id').references(() => coverLetters.id, {
      onDelete: 'set null',
    }),
    followUpDate: text('follow_up_date'),
    notes: text('notes'),
    interviewDates: text('interview_dates').default('[]'),
    offerDetails: text('offer_details'),
    rejectionReason: text('rejection_reason'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
  },
  (table) => ({
    userIdx: index('idx_applications_user').on(table.userId),
    jobIdx: index('idx_applications_job').on(table.jobId),
    statusIdx: index('idx_applications_status').on(table.status),
    followupIdx: index('idx_applications_followup').on(table.followUpDate),
    uniqueUserJob: uniqueIndex('idx_applications_user_job').on(table.userId, table.jobId),
  })
)

// ============================================================================
// CHAT / AI
// ============================================================================

export const chatConversations = sqliteTable(
  'chat_conversations',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    title: text('title'),
    messageType: text('message_type').default('general'),
    context: text('context').default('{}'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
  },
  (table) => ({
    userIdx: index('idx_conversations_user').on(table.userId),
    jobIdx: index('idx_conversations_job').on(table.jobId),
  })
)

export const chatMessages = sqliteTable(
  'chat_messages',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => chatConversations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    tokensUsed: integer('tokens_used'),
    model: text('model'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
  },
  (table) => ({
    conversationIdx: index('idx_messages_conversation').on(table.conversationId),
  })
)

// ============================================================================
// SCRAPING / MONITORING
// ============================================================================

export const scrapeRuns = sqliteTable(
  'scrape_runs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    triggerType: text('trigger_type').notNull(),
    status: text('status').notNull().default('running'),
    platforms: text('platforms').default('[]'),
    profilesUsed: text('profiles_used').default('[]'),
    totalFound: integer('total_found').default(0),
    newJobs: integer('new_jobs').default(0),
    errors: integer('errors').default(0),
    durationMs: integer('duration_ms'),
    startedAt: text('started_at').default(sql`(datetime('now'))`),
    completedAt: text('completed_at'),
    errorSummary: text('error_summary'),
  },
  (table) => ({
    statusIdx: index('idx_scrape_runs_status').on(table.status),
    dateIdx: index('idx_scrape_runs_date').on(table.startedAt),
  })
)

export const scrapeLogs = sqliteTable(
  'scrape_logs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    scrapeRunId: text('scrape_run_id')
      .notNull()
      .references(() => scrapeRuns.id, { onDelete: 'cascade' }),
    mcpServer: text('mcp_server').notNull(),
    toolName: text('tool_name').notNull(),
    platform: text('platform').notNull(),
    url: text('url'),
    status: text('status').notNull(),
    durationMs: integer('duration_ms'),
    responseSize: integer('response_size'),
    jobsFound: integer('jobs_found').default(0),
    errorMessage: text('error_message'),
    errorCode: text('error_code'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
  },
  (table) => ({
    runIdx: index('idx_scrape_logs_run').on(table.scrapeRunId),
    platformIdx: index('idx_scrape_logs_platform').on(table.platform),
    statusIdx: index('idx_scrape_logs_status').on(table.status),
  })
)

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  searchProfiles: many(searchProfiles),
  resumes: many(resumes),
  coverLetters: many(coverLetters),
  jobApplications: many(jobApplications),
  chatConversations: many(chatConversations),
  scrapeRuns: many(scrapeRuns),
}))

export const searchProfilesRelations = relations(searchProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [searchProfiles.userId],
    references: [users.id],
  }),
  matches: many(profileJobMatches),
  applications: many(jobApplications),
}))

export const jobsRelations = relations(jobs, ({ many }) => ({
  recruiterContacts: many(recruiterContacts),
  matches: many(profileJobMatches),
  applications: many(jobApplications),
  chatConversations: many(chatConversations),
}))

export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  user: one(users, {
    fields: [jobApplications.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [jobApplications.jobId],
    references: [jobs.id],
  }),
  profile: one(searchProfiles, {
    fields: [jobApplications.profileId],
    references: [searchProfiles.id],
  }),
  resume: one(resumes, {
    fields: [jobApplications.resumeId],
    references: [resumes.id],
  }),
  coverLetter: one(coverLetters, {
    fields: [jobApplications.coverLetterId],
    references: [coverLetters.id],
  }),
}))

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [chatConversations.jobId],
    references: [jobs.id],
  }),
  messages: many(chatMessages),
}))

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}))

export const scrapeRunsRelations = relations(scrapeRuns, ({ one, many }) => ({
  user: one(users, {
    fields: [scrapeRuns.userId],
    references: [users.id],
  }),
  logs: many(scrapeLogs),
}))

export const scrapeLogsRelations = relations(scrapeLogs, ({ one }) => ({
  scrapeRun: one(scrapeRuns, {
    fields: [scrapeLogs.scrapeRunId],
    references: [scrapeRuns.id],
  }),
}))
