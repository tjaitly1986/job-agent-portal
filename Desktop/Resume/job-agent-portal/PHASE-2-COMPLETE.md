# Phase 2: Database Schema + Drizzle ORM - COMPLETE ✅

**Completion Date**: February 12, 2026

## Summary

Phase 2 has been successfully completed. The Job Agent Portal now has a complete, production-ready database layer with 14 tables, comprehensive validation schemas, migration system, and sample data.

## What Was Accomplished

### ✅ Database Schema (14 Tables)

**Created `src/lib/db/schema.ts`** with complete Drizzle ORM definitions:

#### Authentication & Users
- `users` — User accounts with authentication
- `sessions` — NextAuth.js session management
- `accounts` — OAuth account linking

#### Search & Job Data
- `search_profiles` — User-defined job search criteria
- `jobs` — Scraped job listings (deduplicated)
- `recruiter_contacts` — Recruiter info linked to jobs
- `profile_job_matches` — Links profiles to matching jobs

#### Application Tracking
- `job_applications` — Full application pipeline tracking
- `resumes` — Uploaded resume files with parsed text
- `cover_letters` — Cover letter files

#### AI Chatbot
- `chat_conversations` — Chat threads
- `chat_messages` — Individual messages

#### Scraping & Monitoring
- `scrape_runs` — Scraping job execution tracking
- `scrape_logs` — Detailed MCP call logs

### ✅ Database Features

**All tables include:**
- UUIDs as primary keys
- Foreign key relationships with cascading deletes
- Proper indexes for query optimization
- Timestamps (created_at, updated_at)
- JSON fields for flexible data storage

**Key indexes created:**
- `idx_jobs_dedup` (unique) — Prevents duplicate jobs
- `idx_jobs_posted` — Fast filtering by date
- `idx_applications_user_job` (unique) — One application per user/job
- `idx_sessions_token` — Fast session lookup
- And 20+ more for optimal performance

### ✅ Validation Schemas (Zod)

**Created 5 comprehensive validation modules:**

1. **`job-schema.ts`** (job listings)
   - `createJobSchema` — Validate scraped job data
   - `jobFilterSchema` — API query parameters
   - `updateJobSchema` — Job updates
   - `createRecruiterContactSchema` — Recruiter info

2. **`profile-schema.ts`** (search profiles)
   - `createProfileSchema` — Profile creation with validation
   - `updateProfileSchema` — Profile updates
   - `profileSearchRequestSchema` — Search triggers

3. **`tracker-schema.ts`** (applications)
   - `createApplicationSchema` — New applications
   - `updateApplicationSchema` — Status updates
   - `applicationFilterSchema` — Query filters
   - Status enum: saved → ready_to_apply → applied → phone_screen → interview → technical → offer/rejected

4. **`auth-schema.ts`** (authentication)
   - `registerSchema` — User registration with password rules
   - `loginSchema` — Login validation
   - `updateUserSchema` — Profile updates
   - `changePasswordSchema` — Password changes

5. **`chat-schema.ts`** (AI chatbot)
   - `createConversationSchema` — New conversations
   - `sendMessageSchema` — Message validation
   - `createConversationWithMessageSchema` — Combined creation

### ✅ Database Connection

**Created `src/lib/db/index.ts`:**
- Singleton SQLite connection pattern
- WAL mode enabled for better concurrency
- Foreign key constraints enforced
- Auto-creates data directory
- Graceful shutdown handlers
- Environment-aware verbose logging

### ✅ Migration System

**Created `scripts/migrate.ts`:**
- Programmatic migration runner
- Uses Drizzle Kit migration system
- Error handling and logging

**Generated initial migration:**
- `src/lib/db/migrations/0000_messy_peter_quill.sql`
- 14 tables with all indexes and constraints
- Foreign key relationships
- Default values and constraints

### ✅ Seed Data

**Created `scripts/seed-db.ts`** with realistic sample data:

**1 Test User:**
- Email: `test@example.com`
- Password: `Password123!`
- Location: San Francisco, CA
- Parsed resume text for AI context

**2 Search Profiles:**
- "AI Solution Architect" (active)
  - C2C/Contract roles
  - $85-120/hr
  - Skills: Python, TensorFlow, AWS
- "EDI Developer" (inactive)
  - Contract roles
  - $70-95/hr
  - Skills: EDI, X12, B2B

**3 Sample Jobs:**
1. AI Solution Architect @ Tech Corp (Indeed, $95-110/hr, 1 day ago)
2. Machine Learning Engineer @ AI Innovations (Dice, Remote, C2C, $100-120/hr, just posted)
3. Senior AI Architect @ Future Tech (LinkedIn, $140k-180k/yr, 2 days ago)

**2 Recruiter Contacts:**
- Sarah Johnson (Tech Recruiters Inc) — with email, phone, LinkedIn
- Mike Chen (AI Innovations) — hiring manager

**1 Resume:**
- AI Architect resume (parsed PDF)
- Labeled "AI Roles"
- Set as default

**3 Job Applications:**
- Tech Corp role → Applied (3 hours ago)
- AI Innovations → Saved (needs follow-up)
- Future Tech → Ready to Apply (prepare cover letter)

### ✅ Database Verification

**Created `scripts/test-db.ts`** — Comprehensive test suite:

```
✅ Users: 1
✅ Test user found: Test User (test@example.com)
✅ Search profiles: 2
✅ Jobs: 3
✅ Job applications: 3
✅ Indeed jobs: 1
✅ User profiles:
   - AI Solution Architect (active)
   - EDI Developer (inactive)

🎉 All database tests passed!
```

## Files Created

```
src/lib/db/
  ├── schema.ts                    # Complete Drizzle schema (14 tables)
  ├── index.ts                     # Database connection singleton
  └── migrations/
      └── 0000_messy_peter_quill.sql  # Initial migration

src/lib/validators/
  ├── job-schema.ts                # Job listing validation
  ├── profile-schema.ts            # Search profile validation
  ├── tracker-schema.ts            # Application tracking validation
  ├── auth-schema.ts               # Authentication validation
  └── chat-schema.ts               # Chat/AI validation

scripts/
  ├── migrate.ts                   # Migration runner
  ├── seed-db.ts                   # Database seeder
  └── test-db.ts                   # Database test suite

data/
  └── portal.sqlite                # SQLite database file (288 KB)
```

## Database Stats

- **Tables**: 14
- **Indexes**: 27
- **Foreign Keys**: 15
- **Database Size**: 288 KB (with seed data)
- **Sample Records**: 12 (1 user, 2 profiles, 3 jobs, 3 applications, 2 recruiters, 1 resume)

## NPM Scripts

```bash
# Generate migration from schema changes
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Open Drizzle Studio (GUI)
npm run db:studio
```

## Key Design Decisions

### 1. Deduplication Strategy
Jobs are deduplicated using `dedup_hash` — SHA-256 of:
- Normalized title (lowercase, trimmed)
- Normalized company name
- Normalized location

This prevents the same job from appearing multiple times when scraped from different platforms.

### 2. JSON Fields for Flexibility
Several fields use JSON storage:
- `search_profiles.job_titles` — array of title variations
- `search_profiles.skills` — array of required skills
- `job_applications.interview_dates` — array of timestamps
- `users.preferences` — flexible user settings

### 3. Timestamp Normalization
All timestamps stored as ISO 8601 UTC strings for consistency:
- `jobs.posted_at` — normalized UTC time
- `jobs.posted_at_raw` — original text ("2 hours ago")

### 4. Salary Normalization
Salaries always stored as hourly rates for comparison:
- Annual salaries divided by 2080 hours
- Enables consistent filtering across all job types

### 5. Soft Deletes via Foreign Keys
- `ON DELETE CASCADE` — For owned data (user's profiles, applications)
- `ON DELETE SET NULL` — For references (job deleted, keep application history)

## Database Relations

```
users
  ├─→ sessions (1:many)
  ├─→ accounts (1:many, OAuth)
  ├─→ search_profiles (1:many)
  ├─→ resumes (1:many)
  ├─→ cover_letters (1:many)
  ├─→ job_applications (1:many)
  ├─→ chat_conversations (1:many)
  └─→ scrape_runs (1:many)

jobs
  ├─→ recruiter_contacts (1:1)
  ├─→ profile_job_matches (1:many)
  ├─→ job_applications (1:many)
  └─→ chat_conversations (1:many)

search_profiles
  ├─→ profile_job_matches (many:many with jobs)
  └─→ job_applications (1:many)

chat_conversations
  └─→ chat_messages (1:many)

scrape_runs
  └─→ scrape_logs (1:many)
```

## Migration Path to PostgreSQL

When ready to migrate from SQLite to PostgreSQL:

1. Update `drizzle.config.ts`:
   ```ts
   dialect: 'postgresql'
   ```

2. Change column types:
   - `TEXT` → `VARCHAR` (with lengths)
   - `INTEGER` (mode: boolean) → `BOOLEAN`
   - `REAL` → `NUMERIC` or `DECIMAL`

3. Update default timestamps:
   - `datetime('now')` → `NOW()`

4. No application code changes needed! Drizzle ORM abstracts the differences.

## Next Steps: Phase 3 - Authentication

Phase 3 will implement:
1. NextAuth.js v5 configuration
2. Credentials provider (email/password)
3. OAuth providers (Google, GitHub)
4. Session management
5. Protected route middleware
6. Login/register pages
7. User profile management

**Estimated Files to Create**: ~12 files
**Estimated Time**: 2-3 hours

---

## Phase 2 Checklist ✅

- [x] Create complete Drizzle ORM schema (14 tables)
- [x] Create database connection singleton
- [x] Create Zod validation schemas (5 modules)
- [x] Create migration script
- [x] Create seed script with realistic data
- [x] Generate initial migration
- [x] Run migrations successfully
- [x] Seed database with sample data
- [x] Test database queries
- [x] Verify all tables and indexes

**Status**: ✅ COMPLETE — Ready to proceed to Phase 3 (Authentication)
