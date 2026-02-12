---
name: job-agent-portal
description: "**Job Agent Portal Builder**: Full-stack web application development for a multi-platform job aggregation portal. Uses Bright Data MCP and Playwright MCP servers to scrape jobs from Indeed, Dice, Glassdoor, ZipRecruiter, LinkedIn, and other major US job boards. Features include: multi-user auth, search profile management, 24-hour job filtering, resume/cover letter upload (PDF+DOCX), recruiter contact extraction (phone, email, LinkedIn), application tracking pipeline (Kanban + table), AI chatbot (Claude API) for generating personalized LinkedIn/email outreach messages, and scheduled + on-demand job fetching. Tech stack: Next.js 14+ App Router, React 18, TypeScript, Tailwind CSS, shadcn/ui, SQLite + Drizzle ORM, NextAuth.js v5, node-cron + BullMQ. Trigger this skill when the user mentions: building the job portal, job agent portal, portal development, adding features to the portal, fixing portal bugs, portal scraping issues, portal database, portal API routes, portal chatbot, portal UI components, portal deployment, or any development task related to the job aggregation web application."
---

# Job Agent Portal — Development Skill

A comprehensive development guide for building the Job Agent Portal. This skill provides Claude Code with all the context needed to develop, debug, and extend every part of the portal.

## Quick Context

- **What**: Multi-user web portal aggregating US job listings from 5+ platforms
- **Stack**: Next.js 14 + React + TypeScript + SQLite + Drizzle ORM
- **MCP Servers**: Bright Data (scraping) + Playwright (browser automation)
- **AI**: Claude API for chatbot outreach message generation
- **Auth**: NextAuth.js v5 (email/password + optional OAuth)

## Reference Files

Before starting any task, read the relevant reference files:

| Task | Read First |
|------|-----------|
| Any task | `CLAUDE.md` (always read first for full project context) |
| Database changes | `DATABASE-SCHEMA.md` |
| API endpoints | `API-SPEC.md` |
| Scraper development | `MCP-CONFIG.md` |
| UI development | `UI-COMPONENTS.md` |
| Architecture decisions | `ARCHITECTURE.md` |
| Environment & setup | `SETUP-GUIDE.md` |
| Git hooks & CI | `HOOKS-CONFIG.md` |

## Development Workflow

### Phase 1: Project Initialization

1. Initialize Next.js project with TypeScript and App Router
2. Install and configure all dependencies (see SETUP-GUIDE.md)
3. Set up Drizzle ORM with SQLite schema
4. Configure NextAuth.js with credentials provider
5. Set up Tailwind CSS + shadcn/ui
6. Create folder structure per CLAUDE.md specification
7. Set up environment variables from .env.example

### Phase 2: Database & ORM Layer

1. Define all Drizzle schema tables (see DATABASE-SCHEMA.md)
2. Create migration files
3. Build database utility functions (CRUD operations)
4. Create Zod validation schemas matching each table
5. Write seed script for development data
6. Test all database operations

### Phase 3: MCP Integration Layer

1. Set up Bright Data MCP client connection
2. Set up Playwright MCP client connection
3. Build platform-specific scraper modules:
   - Indeed scraper (Bright Data primary)
   - Dice scraper (Bright Data primary)
   - Glassdoor scraper (Bright Data scraping_browser)
   - ZipRecruiter scraper (Bright Data primary)
   - LinkedIn scraper (Bright Data scraping_browser + Playwright fallback)
4. Build scraper manager (orchestration, dedup, error handling)
5. Implement rate limiting per platform
6. Implement posting date normalization (24-hour filter)
7. Test each scraper individually

### Phase 4: API Routes

1. Authentication routes (NextAuth)
2. Jobs API (list, filter, search, detail)
3. Profiles API (CRUD search profiles)
4. Tracker API (CRUD applications)
5. Resumes API (upload, list, parse)
6. Chat API (Claude streaming)
7. Scrapers API (trigger, status)
8. Recruiters API (LinkedIn lookup)

### Phase 5: Frontend Components

1. Layout components (Sidebar, Topbar, DashboardShell)
2. Job listing components (grid, cards, filters, detail)
3. Profile management components
4. Application tracker (table + Kanban views)
5. Resume upload components
6. Chat interface components
7. Settings page

### Phase 6: AI Chatbot Integration

1. Set up Anthropic SDK client
2. Define system prompts for each message type
3. Implement streaming chat responses
4. Build context injection (resume + job description + recruiter info)
5. Add message type selection (LinkedIn request, InMail, email, follow-up)
6. Test message quality across different job types

### Phase 7: Scheduling & Background Jobs

1. Set up node-cron for periodic scraping
2. Configure BullMQ job queue (or in-memory fallback)
3. Implement scheduled scrape for all active profiles
4. Add notification system for new matching jobs
5. Implement scrape history and status tracking

### Phase 8: Testing & Polish

1. Unit tests for scrapers, utils, validators
2. Integration tests for API routes
3. E2E tests for critical user flows
4. Performance optimization (lazy loading, pagination)
5. Error boundary implementation
6. Loading states and skeleton screens
7. Mobile responsiveness

## Scraper Development Guide

### Base Scraper Pattern

Every platform scraper must extend the base pattern:

```typescript
// src/lib/scrapers/base-scraper.ts
export interface ScrapedJob {
  externalId: string;          // Platform-specific job ID
  platform: 'indeed' | 'dice' | 'glassdoor' | 'ziprecruiter' | 'linkedin' | 'other';
  title: string;
  company: string;
  location: string;            // City, State or "Remote"
  salary: string | null;       // Raw salary/rate text
  salaryMin: number | null;    // Parsed minimum
  salaryMax: number | null;    // Parsed maximum
  salaryType: 'hourly' | 'annual' | null;
  description: string;         // Full job description text
  descriptionHtml: string;     // HTML version if available
  postedAt: Date;              // Normalized UTC timestamp
  postedAtRaw: string;         // Original posting date text
  applyUrl: string;            // Direct application URL
  recruiterName: string | null;
  recruiterEmail: string | null;
  recruiterPhone: string | null;
  recruiterLinkedIn: string | null;
  employmentType: string;      // "Contract", "C2C", "Full-time", etc.
  isRemote: boolean;
  dedupHash: string;           // SHA-256(normalize(title+company+location))
  rawData: Record<string, unknown>; // Full raw response for debugging
}

export abstract class BaseScraper {
  abstract platform: string;
  abstract search(query: SearchQuery): Promise<ScrapedJob[]>;
  abstract getJobDetail(jobId: string): Promise<ScrapedJob | null>;

  protected normalizePostingDate(raw: string): Date { /* ... */ }
  protected generateDedupHash(title: string, company: string, location: string): string { /* ... */ }
  protected respectRateLimit(): Promise<void> { /* ... */ }
}
```

### Bright Data MCP Calls

```typescript
// Example: Using Bright Data to scrape Indeed
import { BrightDataMCP } from '../mcp/bright-data';

const brightData = new BrightDataMCP({
  apiKey: process.env.BRIGHT_DATA_API_KEY!,
  zone: process.env.BRIGHT_DATA_ZONE!,
});

// Method 1: Scrape a specific job listing URL
const jobData = await brightData.scrapeAsJson(
  'https://www.indeed.com/viewjob?jk=abc123',
  {
    schema: {
      title: 'string',
      company: 'string',
      location: 'string',
      salary: 'string',
      description: 'string',
      posted: 'string',
    }
  }
);

// Method 2: Search for jobs via search engine
const searchResults = await brightData.searchEngine(
  'AI Solution Architect C2C contract remote site:indeed.com',
  { engine: 'google', count: 20 }
);

// Method 3: Use scraping browser for JS-heavy sites
const linkedInJobs = await brightData.scrapingBrowser(
  'https://www.linkedin.com/jobs/search/?keywords=AI+Solution+Architect&f_TPR=r86400',
  {
    actions: [
      { type: 'wait', selector: '.jobs-search__results-list' },
      { type: 'scroll', direction: 'down', count: 3 },
      { type: 'scrape', selector: '.jobs-search__results-list li' }
    ]
  }
);
```

### Playwright MCP Calls

```typescript
// Example: Using Playwright MCP for LinkedIn login + scrape
import { PlaywrightMCP } from '../mcp/playwright-mcp';

const playwright = new PlaywrightMCP({
  url: process.env.PLAYWRIGHT_MCP_URL!,
});

// Navigate and interact
await playwright.navigate('https://www.linkedin.com/jobs/search/');
await playwright.type('#keywords-input', 'AI Solution Architect');
await playwright.type('#location-input', 'United States');
await playwright.click('button[type="submit"]');
await playwright.wait('.jobs-search-results');

// Extract job listings
const jobs = await playwright.evaluate(`
  Array.from(document.querySelectorAll('.job-search-card')).map(card => ({
    title: card.querySelector('.base-search-card__title')?.textContent?.trim(),
    company: card.querySelector('.base-search-card__subtitle')?.textContent?.trim(),
    location: card.querySelector('.job-search-card__location')?.textContent?.trim(),
    url: card.querySelector('a.base-card__full-link')?.href,
    posted: card.querySelector('time')?.getAttribute('datetime'),
  }))
`);
```

## Chatbot Prompt Templates

### LinkedIn Connection Request (300 char max)

```
You are a professional networking assistant. Generate a LinkedIn connection request message.

CONSTRAINTS:
- MUST be under 300 characters (LinkedIn limit)
- Professional but warm tone
- Reference the specific role or company
- Mention one specific skill match from the resume
- Do NOT include greetings like "Dear" or signatures

RESUME CONTEXT:
{resumeText}

JOB DETAILS:
Title: {jobTitle}
Company: {company}
Key Requirements: {requirements}

RECRUITER: {recruiterName}

Generate ONLY the connection request message, nothing else.
```

### Recruiter Email (Cold Outreach)

```
You are a professional job outreach assistant. Draft a concise recruiter email.

GUIDELINES:
- Subject line: specific and attention-grabbing (include role title)
- 3-4 short paragraphs maximum
- Paragraph 1: Brief intro + why you're reaching out (specific role)
- Paragraph 2: 2-3 most relevant experiences from resume that match the job
- Paragraph 3: Express genuine interest in the company + availability
- Paragraph 4: Call to action (suggest a call)
- Professional sign-off
- Mention open to contract/C2C arrangement
- Keep under 200 words

RESUME CONTEXT:
{resumeText}

JOB DETAILS:
Title: {jobTitle}
Company: {company}
Description: {jobDescription}

RECRUITER: {recruiterName} at {company}

Generate the complete email including subject line.
```

## Error Recovery Patterns

### Scraper Failure Cascade

```
1. Try Bright Data scrape_as_json
   ↓ (fails: 403, timeout, parsing error)
2. Try Bright Data scraping_browser
   ↓ (fails: CAPTCHA, geo-block)
3. Try Playwright MCP direct automation
   ↓ (fails: site down, blocked)
4. Log failure to scrape_jobs table with error details
5. Skip this platform for this search, continue with others
6. Alert user: "Could not reach {platform} — {error}. Results from other platforms shown."
```

### Rate Limit Handling

```typescript
// Exponential backoff with jitter
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (isRateLimitError(error)) {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        await sleep(delay);
      } else {
        throw error; // Don't retry non-rate-limit errors
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Testing Strategy

### Unit Tests (Vitest)
- Scraper date normalization functions
- Deduplication hash generation
- Zod schema validation
- Utility functions
- Rate limiter logic

### Integration Tests (Vitest + MSW)
- API route handlers with mocked database
- Scraper modules with mocked MCP responses
- Auth flows with mocked NextAuth

### E2E Tests (Playwright)
- User registration and login flow
- Create search profile → trigger search → view results
- Upload resume → parse → verify in chat context
- Application tracker CRUD operations
- Chat interaction → message generation
- Apply button opens correct external URL

## Performance Targets

| Metric | Target |
|--------|--------|
| Initial page load (dashboard) | < 2 seconds |
| Job search results display | < 5 seconds |
| Scraping all 5 platforms | < 60 seconds |
| Chat message generation | First token < 1 second |
| Resume upload + parse | < 3 seconds |
| Database query (filtered jobs) | < 100ms |
