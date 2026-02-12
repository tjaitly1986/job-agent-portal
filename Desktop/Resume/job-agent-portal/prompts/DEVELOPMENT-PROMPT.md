# Master Development Prompt — Job Agent Portal

> Copy this prompt into Claude Code at the start of a development session to give it full context.

---

## Prompt

You are building the **Job Agent Portal**, a full-stack, multi-user web application that aggregates job listings from all major US job posting platforms and provides intelligent job search, application tracking, and AI-powered outreach tools.

### Core Technology

- **Framework**: Next.js 14+ with App Router, React 18, TypeScript (strict mode)
- **Styling**: Tailwind CSS 3 + shadcn/ui components
- **Database**: SQLite via Drizzle ORM (file: `./data/portal.sqlite`)
- **Auth**: NextAuth.js v5 with email/password + optional Google/GitHub OAuth
- **State**: Zustand (UI state) + React Query / TanStack Query (server state)
- **AI**: Anthropic Claude API (`claude-sonnet-4-5-20250929`) for chatbot
- **Scraping**: Bright Data MCP (primary) + Playwright MCP (fallback)
- **Scheduling**: node-cron for periodic scraping + BullMQ job queue
- **Testing**: Vitest + React Testing Library + Playwright E2E

### Job Data Sources

The portal scrapes jobs from 5 platforms via the MCP servers:

1. **Indeed** — via Bright Data `scrape_as_json` (datacenter proxy)
2. **Dice** — via Bright Data `scrape_as_json` (datacenter proxy)
3. **Glassdoor** — via Bright Data `scraping_browser` (residential proxy, JS-heavy)
4. **ZipRecruiter** — via Bright Data `scrape_as_json` with residential fallback
5. **LinkedIn** — via Bright Data `scraping_browser` ONLY with residential proxies (strict anti-bot)

Fallback: Playwright MCP for any site that blocks Bright Data.

### Critical Filter

**Jobs posted in the last 24 hours only.** Each platform represents posting time differently — normalize ALL to UTC timestamps:
- Indeed: "Just posted", "Today", "1 day ago"
- Dice: ISO timestamp
- LinkedIn: "X hours ago", "X minutes ago"
- Glassdoor: "Xd", "Xh"
- ZipRecruiter: "Posted today", "Posted X hours ago"

### Key Features

1. **Job Board Dashboard** — Grid/list view of aggregated jobs with filters (platform, time, location, remote, employment type, salary range, search profile)
2. **Search Profiles** — Users create profiles (job titles + skills + location) that define what to search for. Profiles can be included/excluded from searches.
3. **Application Tracker** — Full pipeline tracker with statuses: Saved → Ready to Apply → Applied → Phone Screen → Interview → Technical → Offer/Rejected. Table view + Kanban drag-and-drop view.
4. **Resume & Cover Letter Upload** — Drag-and-drop upload for PDF and DOCX files. Files are parsed for text extraction (used by chatbot).
5. **Recruiter Contact Details** — For each job, extract recruiter name, email, phone, and LinkedIn profile URL. Display as clickable contact card.
6. **Apply Button** — Opens the original job posting URL on the platform in a new browser tab. Does NOT auto-submit applications.
7. **Recruiter LinkedIn Link** — Opens the recruiter's LinkedIn profile in a new tab.
8. **AI Chatbot** — Claude-powered chat that generates personalized outreach messages (LinkedIn connection requests, InMail, cold emails, follow-ups) using the user's resume + job description + recruiter info as context.
9. **Scheduled + On-Demand Scraping** — Automatic job fetching every N hours + manual "Search Now" button.
10. **Multi-User Auth** — Registration, login, per-user data isolation.

### Before You Start

Read these documentation files in the `job-agent-portal/` folder:
1. `CLAUDE.md` — Full project context, conventions, environment variables
2. `ARCHITECTURE.md` — System architecture, data flows, deployment
3. `DATABASE-SCHEMA.md` — All table definitions, indexes, relationships
4. `API-SPEC.md` — Every API endpoint with request/response shapes
5. `MCP-CONFIG.md` — Bright Data + Playwright MCP setup and usage
6. `UI-COMPONENTS.md` — UI wireframes, component specs, design system
7. `HOOKS-CONFIG.md` — Git hooks, CI, and Claude Code hooks
8. `SETUP-GUIDE.md` — Step-by-step local development setup

### Code Conventions

- TypeScript strict mode, no `any` types
- Server Components by default, `"use client"` only when needed
- Zod validation on all API inputs
- Consistent error response shape: `{ success, data?, error? }`
- Files: kebab-case. Components: PascalCase. Functions: camelCase. DB: snake_case.
- Conventional git commits: `feat:`, `fix:`, `refactor:`, `chore:`, `test:`

### Important Constraints

- Never auto-submit job applications
- Rate limit scraping per platform (see MCP-CONFIG.md)
- Deduplicate jobs across platforms by title+company+location hash
- Parse and normalize posting dates to UTC
- Store parsed resume text for chatbot context
- LinkedIn scraping: residential proxies ONLY, strict rate limits
- File uploads: max 10MB, PDF/DOCX only
- Chat: Claude Sonnet for message generation, streaming SSE responses

### Development Phases (Build in This Order)

**Phase 1**: Project initialization + dependencies + folder structure
**Phase 2**: Database schema + Drizzle ORM + migrations
**Phase 3**: Authentication (NextAuth.js v5 + credentials provider)
**Phase 4**: MCP integration layer (Bright Data + Playwright clients)
**Phase 5**: Platform scrapers (Indeed, Dice, Glassdoor, ZipRecruiter, LinkedIn)
**Phase 6**: API routes (jobs, profiles, tracker, resumes, chat, scrapers)
**Phase 7**: Frontend components (layout, jobs, profiles, tracker, resumes, chat)
**Phase 8**: AI chatbot (Claude API integration + streaming)
**Phase 9**: Scheduling (node-cron + BullMQ)
**Phase 10**: Testing + polish + deployment prep

---

Now, start working on the portal. Begin with Phase 1 unless I specify otherwise. Ask me if anything is unclear.
