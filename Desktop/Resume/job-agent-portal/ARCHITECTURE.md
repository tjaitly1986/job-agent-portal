# Architecture — Job Agent Portal

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Next.js App Router (React Server Components + Client)       │  │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌───────┐ ┌───────┐ │  │
│  │  │ Job     │ │ Profile  │ │ Tracker │ │Resume │ │ Chat  │ │  │
│  │  │ Board   │ │ Manager  │ │ Kanban  │ │Upload │ │ Bot   │ │  │
│  │  └────┬────┘ └────┬─────┘ └────┬────┘ └───┬───┘ └───┬───┘ │  │
│  │       │           │            │           │         │      │  │
│  │  ┌────┴───────────┴────────────┴───────────┴─────────┴────┐ │  │
│  │  │            React Query (TanStack Query)                │ │  │
│  │  │            Zustand Stores (UI + Chat State)            │ │  │
│  │  └────────────────────────┬───────────────────────────────┘ │  │
│  └───────────────────────────┼─────────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────────┘
                               │ HTTP / SSE
┌──────────────────────────────┼──────────────────────────────────────┐
│                    NEXT.JS API ROUTES                               │
│  ┌───────────────────────────┼──────────────────────────────────┐  │
│  │  /api/auth    /api/jobs   /api/profiles   /api/tracker       │  │
│  │  /api/resumes  /api/chat  /api/scrapers   /api/recruiters    │  │
│  └───────┬───────────┬───────────┬──────────────┬───────────────┘  │
│          │           │           │              │                   │
│  ┌───────┴──┐  ┌─────┴────┐  ┌──┴──────┐  ┌───┴──────┐          │
│  │NextAuth  │  │ Scraper  │  │ Drizzle │  │ Claude   │          │
│  │  v5      │  │ Manager  │  │  ORM    │  │  API     │          │
│  └──────────┘  └─────┬────┘  └────┬────┘  └──────────┘          │
│                      │            │                               │
│              ┌───────┴───────┐    │                               │
│              │  Rate Limiter │    │                               │
│              │  + Dedup      │    │                               │
│              └───────┬───────┘    │                               │
└──────────────────────┼────────────┼─────────────────────────────────┘
                       │            │
          ┌────────────┼────┐   ┌───┴───────────┐
          │   MCP Layer     │   │  SQLite DB    │
          │  ┌────────────┐ │   │  (portal.db)  │
          │  │ Bright Data│ │   │               │
          │  │   MCP      │ │   │  users        │
          │  └──────┬─────┘ │   │  jobs         │
          │         │       │   │  profiles     │
          │  ┌──────┴─────┐ │   │  applications │
          │  │ Playwright │ │   │  resumes      │
          │  │   MCP      │ │   │  chat         │
          │  └──────┬─────┘ │   │  scrape_logs  │
          └─────────┼───────┘   └───────────────┘
                    │
    ┌───────────────┼────────────────────────┐
    │        JOB BOARD PLATFORMS             │
    │  ┌────────┐ ┌──────┐ ┌──────────────┐ │
    │  │Indeed  │ │Dice  │ │Glassdoor     │ │
    │  └────────┘ └──────┘ └──────────────┘ │
    │  ┌──────────────┐ ┌────────────────┐  │
    │  │ZipRecruiter  │ │LinkedIn        │  │
    │  └──────────────┘ └────────────────┘  │
    └────────────────────────────────────────┘
```

## Key Architecture Decisions

### 1. Next.js App Router (Not Pages Router)

**Decision:** Use Next.js 14+ App Router with React Server Components.

**Rationale:**
- Server Components reduce client bundle size (heavy scraper logic stays server-side)
- API Routes colocated with the app, no separate backend needed
- Built-in streaming support for the chat feature (SSE via ReadableStream)
- Middleware for authentication guard on all routes
- Future-proof: App Router is the stable direction for Next.js

### 2. SQLite + Drizzle ORM (Not PostgreSQL + Prisma)

**Decision:** Start with SQLite, use Drizzle ORM for type-safe queries.

**Rationale:**
- Zero infrastructure: no database server to manage
- SQLite handles reads/writes well for single-server deployments
- Drizzle generates raw SQL (no runtime overhead), type-safe, and supports both SQLite and PostgreSQL
- Migration path to PostgreSQL: change Drizzle dialect + update column types
- For scale: when concurrent writes become a bottleneck, migrate to PostgreSQL

**Migration trigger:** When you need either (a) >10 concurrent write users, or (b) full-text search performance beyond SQLite FTS5

### 3. Bright Data MCP as Primary Scraper (Not Direct HTTP)

**Decision:** Route all scraping through Bright Data's MCP server.

**Rationale:**
- Proxy rotation handled by Bright Data (no IP management)
- Anti-bot bypass built into their infrastructure
- Residential proxy access for LinkedIn (critical requirement)
- Scraping browser for JS-rendered pages (Glassdoor, LinkedIn)
- Structured data extraction (scrape_as_json) reduces parsing code
- Cost-effective compared to building/maintaining proxy infrastructure

### 4. Playwright MCP as Fallback (Not Puppeteer/Selenium)

**Decision:** Use Playwright MCP for browser automation fallback.

**Rationale:**
- MCP protocol gives Claude Code direct access to browser automation
- Playwright is faster and more reliable than Selenium
- Cross-browser support (Chromium, Firefox, WebKit)
- Built-in auto-wait for elements (less flaky than raw Puppeteer)
- Same API for testing (E2E) and scraping

### 5. Claude API for Chatbot (Not Fine-Tuned Model)

**Decision:** Use Claude Sonnet via Anthropic API with system prompts.

**Rationale:**
- High-quality message generation out of the box
- System prompt injection for resume + job context
- Streaming responses for real-time chat feel
- No training/fine-tuning overhead
- Cost: ~$3/MTok input, ~$15/MTok output (manageable for individual messages)

### 6. NextAuth.js v5 for Auth (Not Clerk/Auth0)

**Decision:** Self-hosted auth with NextAuth.js v5.

**Rationale:**
- No external service dependency or cost
- Database sessions stored in SQLite (same DB)
- Supports email/password + OAuth providers
- Full control over user data and session management
- Widely adopted, well-documented, active maintenance

### 7. Zustand + React Query (Not Redux)

**Decision:** Zustand for UI state, React Query for server state.

**Rationale:**
- Zustand: minimal boilerplate, tiny bundle, simple API
- React Query: handles caching, revalidation, optimistic updates for API data
- Clear separation: Zustand = ephemeral UI state, React Query = server-synced data
- No Redux overhead (actions, reducers, middleware)

## Data Flow: Job Search Pipeline

```
User clicks "Search" (or scheduled cron fires)
    │
    ▼
POST /api/jobs/search
    │
    ▼
Scraper Manager receives request
    ├── Reads active search profiles from DB
    ├── Determines which platforms to search
    └── Creates scrape_run record (status: "running")
    │
    ▼
For each (profile × platform):
    │
    ├── Try Bright Data MCP (primary)
    │   ├── search_engine → get listing URLs
    │   ├── scrape_as_json → extract structured data per URL
    │   └── Log result to scrape_logs
    │
    ├── On failure: Try Bright Data scraping_browser
    │   ├── Navigate, scroll, extract via JavaScript
    │   └── Log result to scrape_logs
    │
    └── On failure: Try Playwright MCP (fallback)
        ├── Full browser automation
        └── Log result to scrape_logs
    │
    ▼
For each scraped job:
    ├── Generate dedup_hash (SHA-256 of normalized title+company+location)
    ├── Check if job already exists in DB
    │   ├── EXISTS → update scraped_at timestamp, skip
    │   └── NEW → continue
    ├── Normalize posting date to UTC
    ├── Filter: posted_at >= 24 hours ago?
    │   ├── NO → skip (too old)
    │   └── YES → continue
    ├── Extract recruiter info (if available)
    ├── INSERT into jobs table
    ├── INSERT into recruiter_contacts (if found)
    └── Score against all active profiles → INSERT into profile_job_matches
    │
    ▼
Update scrape_run record (status: "completed", stats)
    │
    ▼
Return results to frontend (or send notification if scheduled)
```

## Data Flow: Chat Message Generation

```
User selects a job + opens chat
    │
    ▼
Frontend sends POST /api/chat
    ├── conversationId (new or existing)
    ├── message: "Draft a LinkedIn message"
    ├── messageType: "linkedin_request"
    └── context: { jobId, resumeId }
    │
    ▼
API Route handler:
    ├── Load job details from DB
    ├── Load recruiter info from DB
    ├── Load user's resume parsed text from DB
    ├── Build system prompt with context injection
    └── Call Claude API with streaming
    │
    ▼
System Prompt Assembly:
    ├── Base prompt (message type specific)
    ├── + Resume context: {parsed resume text}
    ├── + Job context: {title, company, description, requirements}
    ├── + Recruiter context: {name, company}
    └── + Constraints: {char limit for LinkedIn, tone, etc.}
    │
    ▼
Claude API streams response tokens
    │
    ▼
API Route streams SSE events to frontend
    ├── data: {"type": "delta", "content": "..."}
    └── data: {"type": "done", "messageId": "...", "tokensUsed": N}
    │
    ▼
Frontend renders streaming response in chat bubble
    │
    ▼
Save complete message to chat_messages table
```

## Deployment Architecture

### Development (Local)

```
localhost:3000 → Next.js dev server
    ├── SQLite file: ./data/portal.sqlite
    ├── Uploads: ./uploads/{userId}/
    ├── Bright Data MCP: stdio subprocess
    └── Playwright MCP: stdio subprocess
```

### Production (Single Server)

```
VPS / EC2 / DigitalOcean Droplet
    ├── Next.js standalone build (node server.js)
    ├── PM2 process manager (auto-restart)
    ├── Nginx reverse proxy (SSL, caching)
    ├── SQLite file: /data/portal.sqlite
    ├── Uploads: /data/uploads/
    ├── MCP servers: managed subprocesses
    └── Cron: node-cron within the Next.js process
```

### Production (Scaled)

When scaling beyond a single server:

```
Load Balancer (Nginx / AWS ALB)
    ├── Next.js Node 1
    ├── Next.js Node 2
    └── Next.js Node N
        │
        ├── PostgreSQL (replaces SQLite)
        ├── Redis (session store + BullMQ queue)
        ├── S3 (file uploads)
        └── MCP servers (one set per node, or centralized service)
```

## Security Architecture

### Input Validation
- All API inputs validated with Zod schemas
- File uploads: type checking, size limits (10MB max), virus scanning (ClamAV in production)
- SQL injection: impossible with Drizzle ORM parameterized queries
- XSS: React auto-escapes, CSP headers via Next.js middleware

### Authentication & Authorization
- JWT tokens for API access (short-lived, 1 hour)
- Database sessions for server components (7-day expiry)
- CSRF protection via NextAuth.js
- Rate limiting on auth endpoints (5 attempts per minute)

### Data Protection
- Passwords: bcrypt with salt rounds = 12
- API keys: stored in environment variables, never in code or DB
- File uploads: stored outside web root, served via API route with auth check
- PII: user email, phone, LinkedIn stored encrypted at rest (AES-256)

### MCP Security
- Bright Data API key: environment variable only
- Playwright MCP: local-only, no external access
- Scraping: respect robots.txt where legally required
- Rate limiting: per-platform rate limits to avoid bans

## Performance Optimization

### Frontend
- React Server Components for initial page load (zero JS for static parts)
- Dynamic imports for heavy components (chat, file upload)
- Image optimization via Next.js Image component
- Skeleton loading states for perceived performance

### API
- Database indexes on all frequently queried columns (see DATABASE-SCHEMA.md)
- Pagination on all list endpoints (max 100 per page)
- Response compression (gzip via Next.js)
- Cache headers for static job data (5-minute stale-while-revalidate)

### Scraping
- Concurrent scraping across platforms (Promise.allSettled)
- Dedup hash check BEFORE detailed scraping (skip known jobs)
- Connection pooling for Bright Data requests
- Background job queue for heavy scraping operations

### Database
- SQLite WAL mode for concurrent reads during writes
- Batch inserts for job data (50 rows per transaction)
- Regular VACUUM for reclaiming space after data purges
- FTS5 virtual table for full-text job search
