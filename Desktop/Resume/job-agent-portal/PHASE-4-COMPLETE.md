# Phase 4: MCP Integration & Job Scraping - COMPLETE ✅

**Completion Date**: February 12, 2026

## Summary

Phase 4 has been successfully completed. The Job Agent Portal now has a complete job scraping infrastructure with MCP client wrappers, platform-specific scrapers, deduplication logic, and scraper orchestration.

## What Was Accomplished

### ✅ Utility Functions

**Created `src/lib/utils/date-utils.ts`:**
- `normalizePostedDate()` — Converts all date formats to ISO 8601 UTC
  - "Just posted", "Today" → current timestamp
  - "2 hours ago", "5 minutes ago" → calculated timestamp
  - "1 day ago", "3d", "5h" (Glassdoor format) → calculated timestamp
  - ISO timestamps → validated and normalized
- `isPostedWithin24Hours()` — Filter jobs by posting time
- `formatRelativeTime()` — Display dates as "X hours/days ago"

**Created `src/lib/utils/dedup.ts`:**
- `generateDedupHash()` — SHA-256 hash of normalized title + company + location
- `normalizeString()` — Remove special chars, lowercase, trim
- `areSimilarJobs()` — Fuzzy matching for duplicate detection

**Created `src/lib/utils/rate-limiter.ts`:**
- Per-platform rate limiting (singleton pattern)
- Platform-specific limits:
  - Indeed: 2 req/sec
  - Dice: 3 req/sec
  - LinkedIn: 0.5 req/sec (strictest!)
  - Glassdoor: 2 req/sec
  - ZipRecruiter: 2 req/sec
- `throttle()` method with automatic waiting

### ✅ MCP Client Wrappers

**Created `src/lib/mcp/types.ts`:**
- `ScrapedJob` interface
- `RecruiterContact` interface
- `ScrapeResult` interface
- `ScrapeOptions` interface

**Created `src/lib/mcp/bright-data.ts`:**
- `BrightDataClient` class
- Proxy configuration helper
- API methods (placeholder for future implementation)
- Environment variable validation

**Created `src/lib/mcp/playwright-mcp.ts`:**
- `PlaywrightClient` class
- Browser automation methods:
  - navigate, click, type
  - waitForSelector, screenshot
  - evaluate JavaScript
- Ready for production Playwright integration

### ✅ Base Scraper Class

**Created `src/lib/scrapers/base-scraper.ts`:**

Abstract base class providing:
- `scrape()` — Main scraping method (abstract)
- `normalizeJob()` — Convert scraped data to standard format
- `parseSalary()` — Extract salary from text
  - Handles: "$85-95/hr", "$120k-150k/yr", etc.
  - Normalizes all to hourly rate for consistency
- `detectRemote()` — Identify remote jobs from signals
- `waitForRateLimit()` — Automatic rate limiting
- `extractJobIdFromUrl()` — Parse job IDs from URLs
- `log()` — Platform-specific logging

### ✅ Platform Scrapers

**Created `src/lib/scrapers/indeed.ts`:**
- `IndeedScraper` class
- Search URL builder with filters:
  - Query, location, remote
  - Posted within (1d, 3d, 7d)
- Placeholder for scraping implementation

**Created `src/lib/scrapers/dice.ts`:**
- `DiceScraper` class
- C2C/contract focus
- Dice-specific URL parameters
- Recruiter info extraction (placeholder)

**Created `src/lib/scrapers/linkedin.ts`:**
- `LinkedInScraper` class
- Strictest rate limiting (0.5 req/sec)
- Residential proxy requirement
- Recruiter LinkedIn profile extraction (placeholder)
- Login flow support (placeholder)

### ✅ Scraper Manager

**Created `src/lib/scrapers/scraper-manager.ts`:**

Orchestrates all scrapers:
- `scrapeAll()` — Run multiple scrapers in parallel
- Tracks scrape runs in database (`scrape_runs` table)
- Logs each MCP call (`scrape_logs` table)
- Deduplicates jobs across platforms
- Saves unique jobs to database
- Returns comprehensive results:
  - Total found, new jobs, duplicates, errors

**Features:**
- Parallel scraper execution
- Cross-platform deduplication
- Database integration
- Error handling per platform
- Detailed logging

### ✅ MCP Configuration

**Created `mcp-config/bright-data-config.json`:**
- API credentials configuration
- Platform-specific settings:
  - Proxy type (datacenter vs residential)
  - Rate limits per platform
  - Auth requirements
- Capabilities list

**Created `mcp-config/playwright-config.json`:**
- Browser configuration (Chromium, headless)
- Viewport and user agent settings
- Timeout configuration
- Fallback platforms (Glassdoor, LinkedIn)

### ✅ Test Script

**Created `scripts/test-scrapers.ts`:**
- Test individual scrapers: `npm run test:scraper -- --platform=indeed`
- Test all scrapers: `npm run test:scraper -- --platform=all`
- Displays:
  - Search parameters
  - Results summary
  - Sample jobs
  - Errors

## Files Created (15 files)

```
src/lib/utils/
  ├── date-utils.ts            # Date normalization utilities
  ├── dedup.ts                 # Deduplication logic
  └── rate-limiter.ts          # Per-platform rate limiting

src/lib/mcp/
  ├── types.ts                 # TypeScript interfaces
  ├── bright-data.ts           # Bright Data MCP client
  └── playwright-mcp.ts        # Playwright MCP client

src/lib/scrapers/
  ├── base-scraper.ts          # Abstract base class
  ├── indeed.ts                # Indeed scraper
  ├── dice.ts                  # Dice scraper
  ├── linkedin.ts              # LinkedIn scraper
  └── scraper-manager.ts       # Orchestration layer

mcp-config/
  ├── bright-data-config.json  # Bright Data configuration
  └── playwright-config.json   # Playwright configuration

scripts/
  └── test-scrapers.ts         # Test script
```

## Architecture

### Scraping Flow

```
User/Scheduler
    ↓
ScraperManager.scrapeAll()
    ↓
┌─────────────┬──────────────┬─────────────┐
│   Indeed    │    Dice      │  LinkedIn   │  (Parallel)
│  Scraper    │   Scraper    │  Scraper    │
└─────────────┴──────────────┴─────────────┘
    ↓               ↓              ↓
  Rate          Rate           Rate
 Limiter       Limiter        Limiter
    ↓               ↓              ↓
┌──────────────────────────────────────────┐
│      Bright Data / Playwright MCP        │
└──────────────────────────────────────────┘
    ↓
  Parse & Normalize Jobs
    ↓
  Deduplicate Across Platforms
    ↓
  Save to Database (jobs table)
    ↓
  Return Results
```

### Job Normalization Process

1. **Scrape** — Extract raw data from platform
2. **Normalize Date** — Convert "2 hours ago" → ISO timestamp
3. **Parse Salary** — Extract min/max, convert annual → hourly
4. **Detect Remote** — Check title, location, description
5. **Generate Hash** — SHA-256(title + company + location)
6. **Filter 24h** — Only keep jobs posted in last 24 hours
7. **Save** — Insert into database if unique

### Deduplication Strategy

Jobs are deduplicated using:
```
dedupHash = SHA256(normalize(title) + normalize(company) + normalize(location))
```

Example:
- Job 1: "AI Architect" @ "Tech Corp" in "San Francisco, CA" (Indeed)
- Job 2: "AI ARCHITECT!" @ "Tech Corp." in "San Francisco CA" (Dice)
- Both normalize to: "ai architect-tech corp-san francisco ca"
- Same hash → Duplicate detected ✅

## Rate Limiting Implementation

Each platform has specific limits enforced automatically:

```typescript
// Indeed: 2 requests/second
await indeedScraper.scrape(options)
// ↓ RateLimiter waits 500ms between requests

// LinkedIn: 1 request per 2 seconds
await linkedInScraper.scrape(options)
// ↓ RateLimiter waits 2000ms between requests
```

## Salary Normalization

All salaries stored as hourly rates for consistent comparison:

```
Input: "$120,000-$150,000/year"
Output: salaryMin: 57.69, salaryMax: 72.12, salaryType: "annual"
(120000/2080 = 57.69)

Input: "$85-95/hr"
Output: salaryMin: 85, salaryMax: 95, salaryType: "hourly"
```

## Date Normalization Examples

| Platform    | Raw Text       | Normalized (UTC) |
|-------------|----------------|------------------|
| Indeed      | "Just posted"  | 2026-02-12T21:00:00Z |
| Dice        | "2 hours ago"  | 2026-02-12T19:00:00Z |
| LinkedIn    | "1 day ago"    | 2026-02-11T21:00:00Z |
| Glassdoor   | "3d"           | 2026-02-09T21:00:00Z |
| ZipRecruiter| "5h"           | 2026-02-12T16:00:00Z |

## Testing the Scrapers

```bash
# Test Indeed scraper
npm run test:scraper -- --platform=indeed

# Test all scrapers
npm run test:scraper -- --platform=all
```

**Expected Output:**
```
=============================================================
JOB SCRAPER TEST
=============================================================

Search Parameters:
  Query: AI Solution Architect
  Location: United States
  Posted Within: 24 hours
  Remote: Yes
  Employment Types: Contract, C2C

Testing all platforms...

[INDEED] Starting scrape with query: "AI Solution Architect"
[DICE] Starting scrape with query: "AI Solution Architect"
[LINKEDIN] Starting scrape with query: "AI Solution Architect"

=============================================================
RESULTS
=============================================================
Total Found: 0
New Jobs: 0
Duplicates: 0
Errors: 0

=============================================================
TEST COMPLETE
=============================================================
```

## Next Steps: Implementation

The scraping infrastructure is complete. To make it functional:

1. **Bright Data Integration:**
   - Implement actual HTTP requests in `bright-data.ts`
   - Use Bright Data REST API or SDK
   - Handle proxy rotation

2. **HTML Parsing:**
   - Implement `parseJobListing()` in each scraper
   - Use cheerio or similar HTML parser
   - Extract job details from DOM

3. **Recruiter Extraction:**
   - Parse recruiter names from job listings
   - Extract LinkedIn profile URLs
   - Save to `recruiter_contacts` table

4. **Production Deployment:**
   - Set up Bright Data account
   - Configure environment variables
   - Enable scheduled scraping

## Environment Variables

```env
# Bright Data (required for production)
BRIGHT_DATA_API_KEY=<your-api-key>
BRIGHT_DATA_CUSTOMER_ID=<your-customer-id>
BRIGHT_DATA_ZONE=scraping_browser

# Rate limits (optional, defaults provided)
RATE_LIMIT_INDEED=2
RATE_LIMIT_DICE=3
RATE_LIMIT_LINKEDIN=0.5
RATE_LIMIT_GLASSDOOR=2
RATE_LIMIT_ZIPRECRUITER=2
```

## Key Design Decisions

### 1. Abstract Base Class Pattern
All scrapers inherit from `BaseScraper`, ensuring consistent interface and shared logic.

### 2. Singleton Rate Limiter
Single `rateLimiter` instance prevents race conditions when multiple scrapers run in parallel.

### 3. Hourly Salary Storage
All salaries normalized to hourly rate for consistent filtering and comparison.

### 4. SHA-256 Deduplication
Cryptographic hash ensures consistent deduplication even with slight variations in text.

### 5. Parallel Scraping
ScraperManager runs all platform scrapers in parallel for speed.

### 6. Database Logging
Every scrape run and MCP call logged for debugging and monitoring.

## Next: Phase 5 - API Routes

Phase 5 will implement:
1. Jobs API (`/api/jobs`) — List, filter, search jobs
2. Profiles API (`/api/profiles`) — CRUD search profiles
3. Tracker API (`/api/tracker`) — Application tracking
4. Scrapers API (`/api/scrapers`) — Trigger on-demand scraping
5. Resumes API (`/api/resumes`) — Upload and parse resumes

**Estimated Files to Create**: ~15 files
**Estimated Time**: 3-4 hours

---

## Phase 4 Checklist ✅

- [x] Create date normalization utilities
- [x] Create deduplication logic
- [x] Create rate limiter
- [x] Create MCP type definitions
- [x] Create Bright Data MCP client
- [x] Create Playwright MCP client
- [x] Create base scraper class
- [x] Create Indeed scraper
- [x] Create Dice scraper
- [x] Create LinkedIn scraper
- [x] Create scraper manager
- [x] Create MCP configuration files
- [x] Create test script

**Status**: ✅ COMPLETE (Infrastructure Ready) — Ready to proceed to Phase 5 (API Routes)

**Note**: Scrapers are placeholder implementations. Actual HTTP requests and HTML parsing will be added when Bright Data credentials are configured.
