# Database Schema — Job Agent Portal

SQLite database managed via Drizzle ORM. All tables defined in `src/lib/db/schema.ts`.

## Entity Relationship Diagram

```
users 1──* sessions
users 1──* search_profiles
users 1──* resumes
users 1──* cover_letters
users 1──* job_applications
users 1──* chat_conversations

search_profiles *──* jobs (via profile_job_matches)
jobs 1──1 recruiter_contacts
jobs 1──* job_applications
jobs 1──1 job_details

chat_conversations 1──* chat_messages
scrape_runs 1──* scrape_logs
```

## Table Definitions

### users

Stores registered users with authentication data.

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT,                    -- bcrypt hash, NULL for OAuth users
  image         TEXT,                    -- Avatar URL
  phone         TEXT,
  linkedin_url  TEXT,
  location      TEXT,                    -- e.g., "San Francisco, CA"
  resume_text   TEXT,                    -- Parsed text from latest resume (for chatbot context)
  preferences   TEXT DEFAULT '{}',       -- JSON: notification settings, default filters, etc.
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
```

### sessions

NextAuth.js session tracking.

```sql
CREATE TABLE sessions (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at    TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
```

### accounts

OAuth account linking (NextAuth.js).

```sql
CREATE TABLE accounts (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL,     -- "oauth", "credentials"
  provider            TEXT NOT NULL,     -- "google", "github", "credentials"
  provider_account_id TEXT NOT NULL,
  access_token        TEXT,
  refresh_token       TEXT,
  expires_at          INTEGER,
  token_type          TEXT,
  scope               TEXT,

  UNIQUE(provider, provider_account_id)
);

CREATE INDEX idx_accounts_user ON accounts(user_id);
```

### search_profiles

User-defined job search profiles with criteria.

```sql
CREATE TABLE search_profiles (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,           -- e.g., "AI Solution Architect"
  is_active       INTEGER DEFAULT 1,      -- 0 = excluded from searches, 1 = included
  job_titles      TEXT NOT NULL,           -- JSON array: ["AI Solution Architect", "AI Architect"]
  skills          TEXT DEFAULT '[]',       -- JSON array: ["Python", "TensorFlow", "AWS"]
  locations       TEXT DEFAULT '["United States"]', -- JSON array of locations
  is_remote       INTEGER DEFAULT 1,      -- 1 = include remote jobs
  employment_types TEXT DEFAULT '["contract", "c2c"]', -- JSON array
  min_salary      INTEGER,                -- Minimum hourly rate or annual salary
  max_salary      INTEGER,
  salary_type     TEXT DEFAULT 'hourly',  -- "hourly" | "annual"
  exclude_keywords TEXT DEFAULT '[]',     -- JSON array: ["security clearance", "US citizen"]
  include_keywords TEXT DEFAULT '[]',     -- JSON array: ["C2C", "Corp to Corp"]
  platforms       TEXT DEFAULT '["indeed","dice","glassdoor","ziprecruiter","linkedin"]', -- JSON array
  domain          TEXT,                    -- "AI", "EDI", "ERP", "Cross-Domain"
  notes           TEXT,
  last_searched   TEXT,                    -- Last time this profile was used for a search
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_profiles_user ON search_profiles(user_id);
CREATE INDEX idx_profiles_active ON search_profiles(is_active);
```

### jobs

All scraped job listings (deduplicated across platforms).

```sql
CREATE TABLE jobs (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  external_id     TEXT,                    -- Platform-specific job ID
  platform        TEXT NOT NULL,           -- "indeed", "dice", "glassdoor", "ziprecruiter", "linkedin", "other"
  dedup_hash      TEXT NOT NULL,           -- SHA-256(normalized title + company + location)
  title           TEXT NOT NULL,
  company         TEXT NOT NULL,
  location        TEXT NOT NULL,           -- "City, State" or "Remote"
  is_remote       INTEGER DEFAULT 0,
  salary_text     TEXT,                    -- Raw salary text: "$85-95/hr" or "$120,000-$150,000/yr"
  salary_min      REAL,                    -- Parsed minimum (always stored as hourly)
  salary_max      REAL,
  salary_type     TEXT,                    -- "hourly" | "annual"
  employment_type TEXT,                    -- "Contract", "C2C", "Full-time", "Contract Corp To Corp"
  description     TEXT,                    -- Full description text
  description_html TEXT,                   -- HTML version
  requirements    TEXT,                    -- Key requirements extracted
  posted_at       TEXT NOT NULL,           -- ISO 8601 UTC timestamp
  posted_at_raw   TEXT,                    -- Original text: "2 hours ago", "Today"
  apply_url       TEXT NOT NULL,           -- Direct application URL on the original platform
  source_url      TEXT,                    -- URL where we found this listing
  is_expired      INTEGER DEFAULT 0,
  scraped_at      TEXT DEFAULT (datetime('now')),
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_jobs_dedup ON jobs(dedup_hash);
CREATE INDEX idx_jobs_platform ON jobs(platform);
CREATE INDEX idx_jobs_posted ON jobs(posted_at);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_remote ON jobs(is_remote);
CREATE INDEX idx_jobs_title ON jobs(title);
```

### recruiter_contacts

Recruiter/poster information linked to jobs.

```sql
CREATE TABLE recruiter_contacts (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  job_id          TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name            TEXT,
  email           TEXT,
  phone           TEXT,
  linkedin_url    TEXT,                    -- LinkedIn profile URL
  company         TEXT,                    -- Recruiter's firm (may differ from hiring company)
  title           TEXT,                    -- Recruiter's title
  source          TEXT,                    -- Where we found this info: "dice_listing", "linkedin_scrape", "manual"
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_recruiter_job ON recruiter_contacts(job_id);
CREATE INDEX idx_recruiter_email ON recruiter_contacts(email);
CREATE INDEX idx_recruiter_name ON recruiter_contacts(name);
```

### profile_job_matches

Links search profiles to matching jobs with a relevance score.

```sql
CREATE TABLE profile_job_matches (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  profile_id      TEXT NOT NULL REFERENCES search_profiles(id) ON DELETE CASCADE,
  job_id          TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  match_score     REAL DEFAULT 0.0,       -- 0.0 to 1.0 relevance score
  match_reasons   TEXT DEFAULT '[]',      -- JSON array: ["title_match", "skills_match", "c2c_eligible"]
  is_dismissed    INTEGER DEFAULT 0,      -- User dismissed this match
  created_at      TEXT DEFAULT (datetime('now')),

  UNIQUE(profile_id, job_id)
);

CREATE INDEX idx_matches_profile ON profile_job_matches(profile_id);
CREATE INDEX idx_matches_job ON profile_job_matches(job_id);
CREATE INDEX idx_matches_score ON profile_job_matches(match_score);
```

### job_applications

Application tracking with full pipeline status.

```sql
CREATE TABLE job_applications (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id          TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  profile_id      TEXT REFERENCES search_profiles(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'saved',
  -- Status values: saved, ready_to_apply, applied, phone_screen,
  --   interview, technical, offer, rejected, withdrawn, expired
  applied_at      TEXT,                    -- When the application was submitted
  applied_via     TEXT,                    -- "website", "email", "linkedin", "referral"
  resume_id       TEXT REFERENCES resumes(id) ON DELETE SET NULL,
  cover_letter_id TEXT REFERENCES cover_letters(id) ON DELETE SET NULL,
  follow_up_date  TEXT,                    -- When to follow up
  notes           TEXT,                    -- Free-text notes
  interview_dates TEXT DEFAULT '[]',       -- JSON array of interview dates
  offer_details   TEXT,                    -- JSON: salary, start_date, etc.
  rejection_reason TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_applications_user ON job_applications(user_id);
CREATE INDEX idx_applications_job ON job_applications(job_id);
CREATE INDEX idx_applications_status ON job_applications(status);
CREATE INDEX idx_applications_followup ON job_applications(follow_up_date);
CREATE UNIQUE INDEX idx_applications_user_job ON job_applications(user_id, job_id);
```

### resumes

Uploaded resume files with parsed text.

```sql
CREATE TABLE resumes (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,           -- Original filename
  file_path       TEXT NOT NULL,           -- Storage path: "uploads/{user_id}/resumes/{filename}"
  file_type       TEXT NOT NULL,           -- "pdf" | "docx"
  file_size       INTEGER NOT NULL,        -- Size in bytes
  parsed_text     TEXT,                    -- Extracted text content
  is_default      INTEGER DEFAULT 0,      -- Is this the user's default resume?
  label           TEXT,                    -- User label: "AI Roles", "EDI Roles"
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_resumes_user ON resumes(user_id);
```

### cover_letters

Uploaded cover letter files.

```sql
CREATE TABLE cover_letters (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  file_type       TEXT NOT NULL,           -- "pdf" | "docx"
  file_size       INTEGER NOT NULL,
  parsed_text     TEXT,
  label           TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_coverletters_user ON cover_letters(user_id);
```

### chat_conversations

Chat conversation threads.

```sql
CREATE TABLE chat_conversations (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id          TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  title           TEXT,                    -- Auto-generated from first message or job title
  message_type    TEXT DEFAULT 'general',  -- "linkedin_request", "linkedin_inmail", "email", "followup", "general"
  context         TEXT DEFAULT '{}',       -- JSON: resume_id, job context, recruiter info
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_conversations_user ON chat_conversations(user_id);
CREATE INDEX idx_conversations_job ON chat_conversations(job_id);
```

### chat_messages

Individual messages within a conversation.

```sql
CREATE TABLE chat_messages (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,           -- "user" | "assistant"
  content         TEXT NOT NULL,
  tokens_used     INTEGER,                -- Token count for cost tracking
  model           TEXT,                    -- "claude-sonnet-4-5-20250929"
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_messages_conversation ON chat_messages(conversation_id);
```

### scrape_runs

Tracks each scraping run (scheduled or on-demand).

```sql
CREATE TABLE scrape_runs (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  trigger_type    TEXT NOT NULL,           -- "scheduled" | "on_demand"
  status          TEXT NOT NULL DEFAULT 'running',
  -- Status: running, completed, partial, failed
  platforms       TEXT DEFAULT '[]',       -- JSON array of platforms scraped
  profiles_used   TEXT DEFAULT '[]',       -- JSON array of profile IDs used
  total_found     INTEGER DEFAULT 0,      -- Total jobs discovered
  new_jobs        INTEGER DEFAULT 0,      -- New unique jobs (not duplicates)
  errors          INTEGER DEFAULT 0,      -- Number of errors encountered
  duration_ms     INTEGER,
  started_at      TEXT DEFAULT (datetime('now')),
  completed_at    TEXT,
  error_summary   TEXT                    -- JSON: platform-specific error details
);

CREATE INDEX idx_scrape_runs_status ON scrape_runs(status);
CREATE INDEX idx_scrape_runs_date ON scrape_runs(started_at);
```

### scrape_logs

Detailed logs for each MCP call during a scrape.

```sql
CREATE TABLE scrape_logs (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  scrape_run_id   TEXT NOT NULL REFERENCES scrape_runs(id) ON DELETE CASCADE,
  mcp_server      TEXT NOT NULL,           -- "bright-data" | "playwright"
  tool_name       TEXT NOT NULL,           -- "scrape_as_json", "search_engine", etc.
  platform        TEXT NOT NULL,           -- "indeed", "dice", etc.
  url             TEXT,
  status          TEXT NOT NULL,           -- "success" | "error" | "timeout" | "rate_limited"
  duration_ms     INTEGER,
  response_size   INTEGER,                 -- Response size in bytes
  jobs_found      INTEGER DEFAULT 0,
  error_message   TEXT,
  error_code      TEXT,                    -- HTTP status code or error type
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_scrape_logs_run ON scrape_logs(scrape_run_id);
CREATE INDEX idx_scrape_logs_platform ON scrape_logs(platform);
CREATE INDEX idx_scrape_logs_status ON scrape_logs(status);
```

## Drizzle ORM Schema (TypeScript)

The above SQL tables map to Drizzle ORM schema definitions in `src/lib/db/schema.ts`. Key patterns:

```typescript
import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  // ... etc
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Repeat for all tables...
```

## Migration Strategy

1. All schema changes go through Drizzle migrations
2. Run `npm run db:migrate` to apply
3. Never modify the SQLite file directly
4. For PostgreSQL migration later: change the Drizzle dialect from `sqlite` to `postgresql` and update column types (TEXT → VARCHAR, INTEGER → BOOLEAN, etc.)

## Data Retention

- Jobs older than 30 days with no application: mark as expired, keep for 90 days, then purge
- Scrape logs older than 7 days: archive to compressed JSON, delete from DB
- Chat messages: keep indefinitely (user's data)
- Active scrape runs: keep all for audit trail
