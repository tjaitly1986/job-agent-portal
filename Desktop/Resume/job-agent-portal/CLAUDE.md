# CLAUDE.md — Job Agent Portal

> This is the master context file for Claude Code. Place this file at the project root so Claude Code automatically reads it on every session.

## Project Overview

**Job Agent Portal** is a full-stack, multi-user web application that aggregates job listings from all major US job posting platforms (Indeed, Dice, Glassdoor, ZipRecruiter, LinkedIn, and others), provides intelligent filtering, resume/cover letter management, recruiter contact lookup, application tracking, and an AI-powered chatbot for generating personalized outreach messages.

The portal uses two core MCP (Model Context Protocol) servers for job data acquisition:
- **Bright Data MCP Server** — structured web scraping and data collection from job boards via Bright Data's proxy infrastructure and scraping APIs
- **Playwright MCP Server** — browser automation for sites requiring interactive navigation, login flows, or JavaScript rendering

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14+ (App Router), React 18+, TypeScript | Server components, API routes, SSR/SSG, scalable to production |
| **Styling** | Tailwind CSS 3+ + shadcn/ui | Consistent design system, accessible components, rapid UI dev |
| **State Management** | Zustand + React Query (TanStack Query) | Lightweight global state + server state caching & sync |
| **Database** | SQLite (via better-sqlite3) + Drizzle ORM | Zero-config, file-based, easy migration path to PostgreSQL |
| **Authentication** | NextAuth.js v5 (Auth.js) | Multi-provider auth, session management, JWT + database sessions |
| **Job Scraping** | Bright Data MCP + Playwright MCP | Structured scraping + browser automation for JS-rendered sites |
| **AI Chatbot** | Anthropic Claude API (claude-sonnet-4-5-20250929) | High-quality message generation, resume-aware context |
| **File Processing** | pdf-parse + mammoth.js (PDF/DOCX parsing) | Extract text from uploaded resumes and cover letters |
| **Scheduling** | node-cron + BullMQ (Redis-backed job queue) | Scheduled scraping with retry logic and rate limiting |
| **Testing** | Vitest + Playwright (E2E) + React Testing Library | Fast unit tests + real browser E2E coverage |
| **Linting** | ESLint + Prettier + TypeScript strict mode | Code quality enforcement |

## Project Structure

```
job-agent-portal/
├── .claude/
│   └── settings.json              # Claude Code project-level settings
├── .env.local                     # Environment variables (never commit)
├── .env.example                   # Template for env vars
├── CLAUDE.md                      # THIS FILE — Claude Code master context
├── next.config.ts                 # Next.js configuration
├── drizzle.config.ts              # Drizzle ORM config
├── package.json
├── tsconfig.json
├── tailwind.config.ts
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Root layout with providers
│   │   ├── page.tsx               # Landing / login page
│   │   ├── (auth)/                # Auth route group
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/           # Protected dashboard routes
│   │   │   ├── layout.tsx         # Dashboard shell (sidebar + topbar)
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx       # Job listings grid with filters
│   │   │   │   └── [id]/page.tsx  # Single job detail view
│   │   │   ├── profiles/
│   │   │   │   └── page.tsx       # Search profile management
│   │   │   ├── tracker/
│   │   │   │   └── page.tsx       # Application tracker (Kanban + table)
│   │   │   ├── resumes/
│   │   │   │   └── page.tsx       # Resume & cover letter management
│   │   │   ├── chat/
│   │   │   │   └── page.tsx       # AI chatbot for outreach messages
│   │   │   └── settings/
│   │   │       └── page.tsx       # User settings, API keys, preferences
│   │   └── api/                   # API routes
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── jobs/
│   │       │   ├── route.ts       # GET (list/filter), POST (trigger scrape)
│   │       │   ├── [id]/route.ts  # GET single job, PATCH update
│   │       │   └── search/route.ts # POST trigger on-demand search
│   │       ├── profiles/
│   │       │   └── route.ts       # CRUD search profiles
│   │       ├── tracker/
│   │       │   └── route.ts       # CRUD application tracking
│   │       ├── resumes/
│   │       │   ├── route.ts       # Upload/list resumes
│   │       │   └── parse/route.ts # Parse resume text extraction
│   │       ├── chat/
│   │       │   └── route.ts       # POST — Claude API streaming chat
│   │       ├── scrapers/
│   │       │   ├── trigger/route.ts   # POST — trigger scraping job
│   │       │   └── status/route.ts    # GET — scraping job status
│   │       └── recruiters/
│   │           └── route.ts       # GET recruiter LinkedIn lookup
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui base components
│   │   ├── jobs/
│   │   │   ├── JobCard.tsx        # Individual job listing card
│   │   │   ├── JobGrid.tsx        # Job listings grid/list view
│   │   │   ├── JobFilters.tsx     # Filter sidebar (platform, date, location, etc.)
│   │   │   ├── JobDetail.tsx      # Full job detail panel
│   │   │   └── ApplyButton.tsx    # External apply link button
│   │   ├── profiles/
│   │   │   ├── ProfileForm.tsx    # Add/edit search profile
│   │   │   └── ProfileList.tsx    # List of active search profiles
│   │   ├── tracker/
│   │   │   ├── TrackerTable.tsx   # Application tracker table view
│   │   │   ├── TrackerKanban.tsx  # Kanban board view
│   │   │   └── TrackerCard.tsx    # Individual application card
│   │   ├── resumes/
│   │   │   ├── ResumeUpload.tsx   # Drag-and-drop file upload
│   │   │   └── ResumeList.tsx     # List uploaded resumes
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx     # Main chat interface
│   │   │   ├── ChatMessage.tsx    # Individual message bubble
│   │   │   └── ChatInput.tsx      # Message input with context selector
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   │   ├── Topbar.tsx         # Top navigation bar
│   │   │   └── DashboardShell.tsx # Dashboard wrapper
│   │   └── shared/
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts           # Database connection singleton
│   │   │   ├── schema.ts          # Drizzle schema definitions
│   │   │   └── migrations/        # SQL migration files
│   │   ├── mcp/
│   │   │   ├── bright-data.ts     # Bright Data MCP client wrapper
│   │   │   ├── playwright-mcp.ts  # Playwright MCP client wrapper
│   │   │   └── types.ts           # Shared MCP types
│   │   ├── scrapers/
│   │   │   ├── indeed.ts          # Indeed scraper via Bright Data
│   │   │   ├── dice.ts            # Dice scraper via Bright Data
│   │   │   ├── glassdoor.ts       # Glassdoor scraper via Bright Data
│   │   │   ├── ziprecruiter.ts    # ZipRecruiter scraper via Bright Data
│   │   │   ├── linkedin.ts        # LinkedIn scraper via Bright Data + Playwright
│   │   │   ├── base-scraper.ts    # Abstract base class for all scrapers
│   │   │   └── scraper-manager.ts # Orchestrates all scrapers, deduplication
│   │   ├── ai/
│   │   │   ├── claude-client.ts   # Anthropic SDK wrapper
│   │   │   ├── prompts.ts         # System prompts for chatbot
│   │   │   └── message-generator.ts # LinkedIn/email message generation
│   │   ├── auth/
│   │   │   └── auth-options.ts    # NextAuth configuration
│   │   ├── scheduler/
│   │   │   ├── cron-jobs.ts       # Cron schedule definitions
│   │   │   └── queue.ts           # BullMQ job queue setup
│   │   ├── file-parser/
│   │   │   ├── pdf-parser.ts      # PDF text extraction
│   │   │   └── docx-parser.ts     # DOCX text extraction
│   │   ├── utils/
│   │   │   ├── dedup.ts           # Job deduplication logic
│   │   │   ├── date-utils.ts      # Date formatting & "posted X ago" parsing
│   │   │   └── rate-limiter.ts    # Per-platform rate limiting
│   │   └── validators/
│   │       ├── job-schema.ts      # Zod schemas for job data
│   │       ├── profile-schema.ts  # Zod schemas for search profiles
│   │       └── tracker-schema.ts  # Zod schemas for tracker entries
│   │
│   ├── hooks/                     # React custom hooks
│   │   ├── useJobs.ts             # Job fetching & filtering
│   │   ├── useProfiles.ts         # Profile CRUD
│   │   ├── useTracker.ts          # Application tracker
│   │   ├── useChat.ts             # Chat streaming
│   │   └── useResumeParser.ts     # Resume upload & parse
│   │
│   ├── stores/                    # Zustand stores
│   │   ├── job-store.ts           # Job filter state
│   │   ├── chat-store.ts          # Chat conversation state
│   │   └── ui-store.ts            # UI state (sidebar, modals)
│   │
│   └── types/
│       ├── job.ts                 # Job-related TypeScript interfaces
│       ├── profile.ts             # Profile types
│       ├── tracker.ts             # Tracker types
│       └── chat.ts                # Chat types
│
├── public/
│   └── assets/                    # Static assets
│
├── scripts/
│   ├── seed-db.ts                 # Database seeding script
│   ├── migrate.ts                 # Run database migrations
│   └── test-scrapers.ts           # Test individual scrapers
│
├── mcp-config/
│   ├── bright-data-config.json    # Bright Data MCP server config
│   └── playwright-config.json     # Playwright MCP server config
│
├── hooks/                         # Claude Code hooks (git hooks + CI checks)
│   ├── pre-push.sh
│   └── pre-commit.sh
│
└── tests/
    ├── unit/
    │   ├── scrapers/
    │   ├── lib/
    │   └── components/
    ├── integration/
    │   └── api/
    └── e2e/
        └── flows/
```

## MCP Server Integration

### Bright Data MCP Server

Bright Data MCP provides structured web scraping through their proxy network. Use it as the PRIMARY data source for all job boards.

**Capabilities used:**
- `scrape_as_markdown` — Scrape a job listing page and return clean markdown
- `scrape_as_json` — Scrape structured job data (title, company, location, salary, etc.)
- `search_engine` — Search Google/Bing for job listings
- `web_data_amazon_product` / custom collectors — Use Bright Data's dataset collectors for specific job board schemas
- `scraping_browser` — Full browser-based scraping for JavaScript-heavy sites

**Platform-specific Bright Data strategies:**
| Platform | Bright Data Method | Notes |
|----------|-------------------|-------|
| Indeed | `scrape_as_json` with Indeed job URLs | Use search_engine first to find listings |
| Dice | `scrape_as_json` with Dice job URLs | Structured data available |
| Glassdoor | `scraping_browser` | JS-heavy, needs browser rendering |
| ZipRecruiter | `scrape_as_json` + `scraping_browser` | Mix of static and dynamic content |
| LinkedIn | `scraping_browser` | Requires authenticated session handling |

### Playwright MCP Server

Playwright MCP provides browser automation when Bright Data alone cannot handle the interaction (login flows, CAPTCHAs, infinite scroll, etc.).

**Capabilities used:**
- `browser_navigate` — Navigate to a URL
- `browser_click` — Click elements
- `browser_type` — Type into inputs
- `browser_screenshot` — Take screenshots for debugging
- `browser_wait` — Wait for elements/conditions
- `browser_evaluate` — Execute JavaScript on the page

**When to use Playwright vs Bright Data:**
- Use Bright Data FIRST (faster, more reliable, handles anti-bot measures)
- Fall back to Playwright when: login is required, site blocks Bright Data, complex interaction flow needed, infinite scroll pagination

## Database

SQLite database via Drizzle ORM. Schema is defined in `src/lib/db/schema.ts`.

**Key tables:** users, sessions, search_profiles, jobs, job_applications, resumes, cover_letters, recruiter_contacts, chat_conversations, chat_messages, scrape_jobs

See `DATABASE-SCHEMA.md` for the complete schema definition.

## Authentication

NextAuth.js v5 with these providers:
- **Email/Password** (credentials provider with bcrypt hashing)
- **Google OAuth** (optional, for easier sign-up)
- **GitHub OAuth** (optional)

Session strategy: JWT for API routes, database sessions for server components.

## AI Chatbot

The chatbot uses the Anthropic Claude API to generate personalized outreach messages.

**System prompt context includes:**
- The user's parsed resume text
- The specific job description they're viewing
- The recruiter's name and company (if available)
- Message type (LinkedIn connection request, LinkedIn InMail, email)

**Message types the chatbot generates:**
1. LinkedIn connection request (300 char limit)
2. LinkedIn InMail message
3. Email to recruiter (cold outreach)
4. Email follow-up
5. Custom message based on user prompt

## Key Conventions

### Code Style
- TypeScript strict mode enabled
- Use `interface` over `type` for object shapes
- Use Zod for all runtime validation
- Server actions for form mutations
- API routes return consistent `{ success: boolean, data?: T, error?: string }` shape
- Use `async/await` everywhere, no `.then()` chains

### Component Patterns
- Server Components by default, add `"use client"` only when needed
- Colocation: component + its types + its tests in the same directory
- Use shadcn/ui primitives, extend with Tailwind utility classes
- Loading states via React Suspense + skeleton components

### Error Handling
- All scraper functions must catch and log errors, never throw uncaught
- API routes use try/catch with structured error responses
- Database operations wrapped in transactions where appropriate
- Scraper failures are logged to `scrape_jobs` table with error details

### Naming Conventions
- Files: kebab-case (`job-card.tsx`, `bright-data.ts`)
- Components: PascalCase (`JobCard`, `ProfileForm`)
- Functions/variables: camelCase (`fetchJobs`, `parseResume`)
- Database tables: snake_case (`search_profiles`, `job_applications`)
- Environment variables: UPPER_SNAKE_CASE (`BRIGHT_DATA_API_KEY`)
- API routes: RESTful (`/api/jobs`, `/api/profiles/:id`)

### Git Conventions
- Branch naming: `feature/`, `fix/`, `refactor/`, `chore/`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`
- PR template includes: description, screenshots, testing steps
- Never commit `.env.local`, `*.sqlite`, `node_modules/`, `uploads/`

## Environment Variables

```env
# Authentication
NEXTAUTH_SECRET=           # Random 32+ char secret
NEXTAUTH_URL=              # http://localhost:3000 for local dev

# Bright Data MCP
BRIGHT_DATA_API_KEY=       # Bright Data API token
BRIGHT_DATA_ZONE=          # Scraping zone (e.g., "scraping_browser")
BRIGHT_DATA_CUSTOMER_ID=   # Bright Data customer ID

# Playwright MCP
PLAYWRIGHT_MCP_URL=        # Playwright MCP server URL (default: ws://localhost:3001)

# Anthropic Claude API
ANTHROPIC_API_KEY=         # Anthropic API key for chatbot

# Database
DATABASE_URL=              # file:./data/portal.sqlite

# Optional OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Scheduler
CRON_SCHEDULE=             # Default: "0 */6 * * *" (every 6 hours)
REDIS_URL=                 # For BullMQ job queue (optional, falls back to in-memory)
```

## Development Commands

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Start development server
npm run dev

# Run all tests
npm run test

# Run E2E tests
npm run test:e2e

# Lint and format
npm run lint
npm run format

# Build for production
npm run build

# Start production server
npm start

# Test individual scrapers
npm run test:scraper -- --platform=indeed
npm run test:scraper -- --platform=dice
npm run test:scraper -- --platform=linkedin
```

## Critical Implementation Notes

1. **Rate Limiting**: Each job board has different rate limits. Implement per-platform rate limiting:
   - Indeed: max 2 requests/second
   - Dice: max 3 requests/second
   - LinkedIn: max 1 request/2 seconds (strictest, use Bright Data residential proxies)
   - Glassdoor: max 2 requests/second
   - ZipRecruiter: max 2 requests/second

2. **Job Deduplication**: Jobs appear on multiple platforms. Dedup by: normalized title + company name + location. Store a `dedup_hash` (SHA-256 of normalized fields) in the jobs table.

3. **24-Hour Filter**: The critical filter is "jobs posted in the last 24 hours." Each platform represents posting time differently:
   - Indeed: "Just posted", "Today", "1 day ago"
   - Dice: ISO timestamp in API response
   - LinkedIn: "X hours ago", "X minutes ago"
   - Glassdoor: "Xd" (days), "Xh" (hours)
   - ZipRecruiter: "Posted today", "Posted X hours ago"
   Parse ALL these formats into UTC timestamps and filter `WHERE posted_at >= NOW() - INTERVAL 24 HOURS`.

4. **LinkedIn Scraping**: LinkedIn is the most restricted platform. Always use Bright Data's residential proxies + scraping browser for LinkedIn. Never scrape LinkedIn without proxy rotation. Respect their rate limits strictly.

5. **Recruiter Contact Extraction**: For each job, attempt to find recruiter info:
   - Dice: Often lists recruiter name + company directly on the job page
   - Indeed: Usually hidden, check company page
   - LinkedIn: Poster's name is often visible; link to their LinkedIn profile
   - Use Bright Data to scrape the recruiter's LinkedIn profile for email/phone when available

6. **Resume Parsing**: When a user uploads a PDF/DOCX resume, extract the text content and store it in the database. This parsed text is used by the chatbot to generate personalized messages. Use pdf-parse for PDFs and mammoth.js for DOCX files.

7. **Apply Button Behavior**: The "Apply" button does NOT submit an application. It opens the original job posting URL in a new browser tab so the user can apply directly on the platform.

8. **Recruiter Link Behavior**: The recruiter contact link opens the recruiter's LinkedIn profile in a new tab if available. If only email/phone is available, show a contact card popover.
