# MCP Server Configuration — Bright Data + Playwright

This document covers the complete setup, configuration, and usage patterns for both MCP servers powering the Job Agent Portal's scraping engine.

## Overview

The portal uses a two-tier scraping architecture:

```
Tier 1: Bright Data MCP (Primary)
  ├── Structured data extraction (JSON/Markdown)
  ├── Search engine queries
  ├── Proxy-rotated scraping (residential, datacenter)
  └── Scraping browser (headless Chromium via Bright Data infra)

Tier 2: Playwright MCP (Fallback)
  ├── Full browser automation
  ├── Login/session flows
  ├── Complex multi-step interactions
  └── Screenshot-based debugging
```

## Bright Data MCP Server

### Installation

```bash
# Option 1: NPX (recommended for Claude Code)
npx @anthropic-ai/claude-code mcp add bright-data -- npx @anthropic-ai/mcp-server-bright-data

# Option 2: Direct npm install
npm install -g @anthropic-ai/mcp-server-bright-data
```

### Claude Code MCP Configuration

Add to your Claude Code project's `.claude/settings.json`:

```json
{
  "mcpServers": {
    "bright-data": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-server-bright-data"],
      "env": {
        "BRIGHT_DATA_API_KEY": "${BRIGHT_DATA_API_KEY}",
        "BRIGHT_DATA_BROWSER_AUTH": "${BRIGHT_DATA_BROWSER_AUTH}"
      }
    }
  }
}
```

Or via the `mcp-config/bright-data-config.json` file:

```json
{
  "server": {
    "name": "bright-data",
    "version": "1.0.0",
    "transport": "stdio"
  },
  "auth": {
    "apiKey": "${BRIGHT_DATA_API_KEY}",
    "customerId": "${BRIGHT_DATA_CUSTOMER_ID}",
    "zone": "${BRIGHT_DATA_ZONE}"
  },
  "scraping": {
    "defaultTimeout": 30000,
    "maxRetries": 3,
    "retryDelay": 2000,
    "proxyType": "residential",
    "geoLocation": "US"
  },
  "rateLimits": {
    "requestsPerSecond": 5,
    "requestsPerMinute": 100,
    "concurrentRequests": 3
  }
}
```

### Bright Data Tools Reference

#### 1. `scrape_as_markdown`
Scrape a URL and return content as clean markdown.

```typescript
// Usage for job listing pages
const result = await mcpClient.call('scrape_as_markdown', {
  url: 'https://www.indeed.com/viewjob?jk=abc123def',
  wait_for: '.jobsearch-JobInfoHeader-title', // CSS selector to wait for
  timeout: 15000
});
// Returns: { markdown: "## Senior AI Engineer\n\n**Company**: Acme Corp..." }
```

**Best for:** Quick content extraction when you need readable text, job descriptions.

#### 2. `scrape_as_json`
Scrape a URL and extract structured data based on a schema.

```typescript
const result = await mcpClient.call('scrape_as_json', {
  url: 'https://www.dice.com/job-detail/abc123',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Job title' },
      company: { type: 'string', description: 'Company name' },
      location: { type: 'string', description: 'Job location' },
      salary: { type: 'string', description: 'Salary or rate' },
      employment_type: { type: 'string', description: 'Full-time, Contract, C2C, etc.' },
      posted_date: { type: 'string', description: 'When the job was posted' },
      description: { type: 'string', description: 'Full job description' },
      apply_url: { type: 'string', description: 'Application URL' },
      recruiter_name: { type: 'string', description: 'Recruiter or poster name' },
      recruiter_email: { type: 'string', description: 'Contact email if visible' }
    }
  }
});
```

**Best for:** Structured data extraction from job detail pages. Use this as the primary scraping method.

#### 3. `search_engine`
Search Google/Bing for job listings.

```typescript
const results = await mcpClient.call('search_engine', {
  query: 'AI Solution Architect C2C contract remote site:indeed.com',
  engine: 'google',
  count: 20,
  country: 'US',
  language: 'en'
});
// Returns array of { title, url, snippet, position }
```

**Best for:** Discovering job listing URLs before detailed scraping. Use as the first step in the scraping pipeline.

#### 4. `scraping_browser`
Full headless browser scraping through Bright Data's infrastructure.

```typescript
const result = await mcpClient.call('scraping_browser', {
  url: 'https://www.linkedin.com/jobs/search/?keywords=AI+Solution+Architect&f_TPR=r86400&location=United+States',
  actions: [
    { type: 'wait', timeout: 5000 },
    { type: 'wait_for_selector', selector: '.jobs-search__results-list' },
    { type: 'scroll', direction: 'down', amount: 3 },
    { type: 'wait', timeout: 2000 },
    {
      type: 'evaluate',
      script: `
        Array.from(document.querySelectorAll('.base-card')).map(card => ({
          title: card.querySelector('.base-search-card__title')?.textContent?.trim(),
          company: card.querySelector('.base-search-card__subtitle')?.textContent?.trim(),
          location: card.querySelector('.job-search-card__location')?.textContent?.trim(),
          url: card.querySelector('a')?.href,
          posted: card.querySelector('time')?.getAttribute('datetime'),
          recruiter: card.querySelector('.base-search-card__subtitle a')?.textContent?.trim()
        }))
      `
    }
  ],
  proxy: {
    type: 'residential',
    country: 'US'
  }
});
```

**Best for:** JavaScript-heavy sites (LinkedIn, Glassdoor), sites requiring scroll/interaction, pages behind client-side rendering.

### Platform-Specific Scraping Strategies

#### Indeed

```typescript
// Step 1: Search for jobs
const searchUrl = 'https://www.indeed.com/jobs?' + new URLSearchParams({
  q: 'AI Solution Architect C2C contract',
  l: 'United States',
  fromage: '1',            // Posted in last 1 day
  sort: 'date',            // Sort by date
  sc: '0kf:jt(contract)',  // Filter: contract jobs
}).toString();

// Step 2: Scrape search results page
const listings = await brightData.scrapeAsJson(searchUrl, {
  schema: {
    jobs: {
      type: 'array',
      items: {
        title: 'string',
        company: 'string',
        location: 'string',
        salary: 'string',
        posted: 'string',
        url: 'string',
        snippet: 'string'
      }
    }
  }
});

// Step 3: Scrape each job detail page
for (const job of listings.jobs) {
  const detail = await brightData.scrapeAsJson(job.url, { /* detailed schema */ });
  await rateLimiter.wait('indeed'); // 2 req/sec limit
}
```

#### Dice

```typescript
// Dice has a clean API-like structure
const searchUrl = 'https://www.dice.com/jobs?' + new URLSearchParams({
  q: 'AI Solution Architect',
  location: 'United States',
  filters: 'postedDate=ONE;employmentType=CONTRACTS',
  page: '1',
  pageSize: '20',
}).toString();

// Dice listings include recruiter info directly
const detail = await brightData.scrapeAsJson(diceJobUrl, {
  schema: {
    title: 'string',
    company: 'string',
    location: 'string',
    salary: 'string',
    employment_type: 'string',  // Often shows "Contract Corp To Corp"
    posted_date: 'string',
    description: 'string',
    recruiter_name: 'string',   // Often available on Dice
    recruiter_company: 'string',
    apply_url: 'string'
  }
});
```

#### Glassdoor

```typescript
// Glassdoor is JS-heavy — use scraping_browser
const glassdoorUrl = 'https://www.glassdoor.com/Job/jobs.htm?' + new URLSearchParams({
  sc: 'GD_JOB_VIEW',
  keyword: 'AI Solution Architect contract',
  locT: 'N',
  locId: '1',  // United States
  fromAge: '1',
}).toString();

const jobs = await brightData.scrapingBrowser(glassdoorUrl, {
  actions: [
    { type: 'wait_for_selector', selector: '.react-job-listing' },
    { type: 'evaluate', script: `/* extract job cards */` }
  ],
  proxy: { type: 'residential', country: 'US' }
});
```

#### ZipRecruiter

```typescript
// ZipRecruiter — use scrape_as_json with residential proxy
const zipUrl = 'https://www.ziprecruiter.com/jobs-search?' + new URLSearchParams({
  search: 'AI Solution Architect C2C contract',
  location: 'United States',
  days: '1',
  employment_type: 'contractor',
}).toString();

const jobs = await brightData.scrapeAsJson(zipUrl, {
  schema: { /* ... */ },
  proxy: { type: 'residential', country: 'US' }
});
```

#### LinkedIn

```typescript
// LinkedIn is the MOST restricted — always use residential proxies + scraping_browser
// CRITICAL: Never scrape LinkedIn without proxy rotation
const linkedInUrl = 'https://www.linkedin.com/jobs/search/?' + new URLSearchParams({
  keywords: 'AI Solution Architect',
  location: 'United States',
  f_TPR: 'r86400',      // Last 24 hours
  f_JT: 'C',            // Contract
  sortBy: 'DD',          // Sort by date
}).toString();

const jobs = await brightData.scrapingBrowser(linkedInUrl, {
  actions: [
    { type: 'wait', timeout: 5000 },
    { type: 'wait_for_selector', selector: '.jobs-search__results-list, .jobs-search-results' },
    { type: 'scroll', direction: 'down', amount: 5 },  // Load more results
    { type: 'wait', timeout: 3000 },
    { type: 'evaluate', script: `/* LinkedIn-specific extraction */` }
  ],
  proxy: {
    type: 'residential',
    country: 'US',
    session: true  // Maintain session across requests
  }
});

// For recruiter LinkedIn profiles (CAREFUL — respect rate limits)
const recruiterProfile = await brightData.scrapingBrowser(
  `https://www.linkedin.com/in/${recruiterSlug}`,
  {
    actions: [
      { type: 'wait_for_selector', selector: '.pv-top-card' },
      { type: 'evaluate', script: `({
        name: document.querySelector('.text-heading-xlarge')?.textContent?.trim(),
        headline: document.querySelector('.text-body-medium')?.textContent?.trim(),
        profileUrl: window.location.href
      })` }
    ],
    proxy: { type: 'residential', country: 'US' }
  }
);
```

## Playwright MCP Server

### Installation

```bash
# Install Playwright MCP server
npx @anthropic-ai/claude-code mcp add playwright -- npx @anthropic-ai/mcp-server-playwright

# Or install globally
npm install -g @anthropic-ai/mcp-server-playwright
```

### Claude Code MCP Configuration

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-server-playwright"],
      "env": {
        "PLAYWRIGHT_HEADLESS": "true",
        "PLAYWRIGHT_BROWSER": "chromium"
      }
    }
  }
}
```

Or via `mcp-config/playwright-config.json`:

```json
{
  "server": {
    "name": "playwright",
    "version": "1.0.0",
    "transport": "stdio"
  },
  "browser": {
    "type": "chromium",
    "headless": true,
    "viewport": { "width": 1280, "height": 720 },
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "timeout": 30000
  },
  "navigation": {
    "waitUntil": "networkidle",
    "timeout": 30000
  }
}
```

### Playwright MCP Tools Reference

| Tool | Description | Parameters |
|------|------------|------------|
| `browser_navigate` | Navigate to a URL | `url: string` |
| `browser_click` | Click an element | `selector: string` |
| `browser_type` | Type into an input | `selector: string, text: string` |
| `browser_screenshot` | Take a screenshot | `fullPage?: boolean` |
| `browser_wait` | Wait for a condition | `selector?: string, timeout?: number` |
| `browser_evaluate` | Execute JavaScript | `script: string` |
| `browser_select` | Select dropdown option | `selector: string, value: string` |
| `browser_scroll` | Scroll the page | `direction: 'up'|'down', amount: number` |
| `browser_go_back` | Navigate back | — |
| `browser_go_forward` | Navigate forward | — |
| `browser_get_content` | Get page HTML/text | `selector?: string` |

### When to Use Playwright (Instead of Bright Data)

| Scenario | Use Playwright |
|----------|---------------|
| Site blocks Bright Data proxies | Yes |
| Need to fill multi-step forms | Yes |
| CAPTCHA appears (needs manual solve) | Flag to user |
| Login required for job details | Yes (with user-provided credentials) |
| Infinite scroll with dynamic loading | Bright Data scraping_browser first, Playwright fallback |
| Screenshot needed for debugging | Yes |
| Cookie consent/popup dismissal | Yes |

## Error Codes & Recovery

| Error | Source | Recovery |
|-------|--------|----------|
| 403 Forbidden | Bright Data | Switch to scraping_browser or Playwright |
| 429 Rate Limited | Any | Exponential backoff, wait then retry |
| CAPTCHA detected | Any | Log warning, skip to next job, flag for manual review |
| Timeout | Any | Retry once with doubled timeout, then skip |
| SSL Error | Bright Data | Switch proxy type (residential → datacenter) |
| Empty response | Any | Retry, if still empty, try alternate scraping method |
| Parse error | Bright Data JSON | Fall back to scrape_as_markdown, parse manually |
| Session expired | LinkedIn | Re-initialize scraping_browser session |

## Proxy Configuration

### Bright Data Proxy Types

| Type | Use For | Speed | Cost | Anti-Detection |
|------|---------|-------|------|----------------|
| Datacenter | Indeed, Dice, ZipRecruiter | Fast | Low | Medium |
| Residential | LinkedIn, Glassdoor | Medium | High | Very High |
| ISP | Backup for any blocked requests | Medium | Medium | High |
| Mobile | Last resort for heavily protected sites | Slow | Highest | Highest |

### Recommended Proxy Strategy by Platform

```
Indeed       → Datacenter (fast, low cost, usually works)
Dice         → Datacenter (open API-like structure)
Glassdoor    → Residential (JS-heavy, some anti-bot)
ZipRecruiter → Datacenter first, Residential fallback
LinkedIn     → Residential ONLY (strict anti-bot detection)
```

## Monitoring & Logging

All MCP calls should be logged for debugging:

```typescript
interface MCPCallLog {
  id: string;
  timestamp: Date;
  server: 'bright-data' | 'playwright';
  tool: string;
  params: Record<string, unknown>;
  duration_ms: number;
  status: 'success' | 'error' | 'timeout';
  error?: string;
  response_size_bytes: number;
}
```

Store in the `scrape_logs` table for debugging and rate limit monitoring.
