# Posting Date Normalization Reference

The 24-hour filter is the most critical feature of the portal. Each platform represents posting dates differently. This document specifies how to normalize all formats to UTC ISO 8601 timestamps.

## Platform Date Formats

### Indeed

| Raw Text | Meaning | Parsing Rule |
|----------|---------|-------------|
| "Just posted" | < 1 hour ago | `now - 30 minutes` |
| "Today" | Today | `today at 00:00 UTC` |
| "1 day ago" | Yesterday | `now - 24 hours` |
| "2 days ago" | 2 days ago | `now - 48 hours` |
| "3 days ago" | 3 days ago | `now - 72 hours` |
| "7 days ago" | 1 week ago | `now - 168 hours` |
| "30+ days ago" | Old | `now - 720 hours` |
| "Active 2 days ago" | Refreshed 2 days ago | `now - 48 hours` (use posting date, not refresh) |

### Dice

| Raw Text | Meaning | Parsing Rule |
|----------|---------|-------------|
| ISO 8601 timestamp | Exact time | Parse directly: `new Date(timestamp)` |
| "Posted today" | Today | `today at 00:00 UTC` |
| "Posted X days ago" | X days ago | `now - (X * 24) hours` |

### LinkedIn

| Raw Text | Meaning | Parsing Rule |
|----------|---------|-------------|
| "X minutes ago" | Minutes ago | `now - X minutes` |
| "X hours ago" | Hours ago | `now - X hours` |
| "1 day ago" | Yesterday | `now - 24 hours` |
| "X days ago" | Days ago | `now - (X * 24) hours` |
| "1 week ago" | 7 days ago | `now - 168 hours` |
| "X weeks ago" | Weeks ago | `now - (X * 168) hours` |
| ISO `datetime` attribute | Exact time | Parse directly from `<time datetime="...">` |

### Glassdoor

| Raw Text | Meaning | Parsing Rule |
|----------|---------|-------------|
| "Xh" | X hours ago | `now - X hours` |
| "Xd" | X days ago | `now - (X * 24) hours` |
| "30d+" | Old | `now - 720 hours` |
| "Easy Apply" prefix | Ignore | Strip prefix, parse remaining |

### ZipRecruiter

| Raw Text | Meaning | Parsing Rule |
|----------|---------|-------------|
| "Posted today" | Today | `today at 00:00 UTC` |
| "Posted X hours ago" | Hours ago | `now - X hours` |
| "Posted X days ago" | Days ago | `now - (X * 24) hours` |
| "Posted over X days ago" | At least X days ago | `now - (X * 24) hours` |

## TypeScript Normalizer

```typescript
// src/lib/utils/date-utils.ts

export function normalizePostingDate(raw: string, platform: string): Date {
  const now = new Date();
  const text = raw.trim().toLowerCase();

  // Try ISO 8601 first (Dice often returns this)
  const isoDate = new Date(raw);
  if (!isNaN(isoDate.getTime()) && raw.includes('T')) {
    return isoDate;
  }

  // Platform-agnostic patterns
  const minutesMatch = text.match(/(\d+)\s*min(?:ute)?s?\s*ago/);
  if (minutesMatch) {
    return new Date(now.getTime() - parseInt(minutesMatch[1]) * 60 * 1000);
  }

  const hoursMatch = text.match(/(\d+)\s*h(?:our)?s?\s*ago/);
  if (hoursMatch) {
    return new Date(now.getTime() - parseInt(hoursMatch[1]) * 3600 * 1000);
  }

  const daysMatch = text.match(/(\d+)\s*d(?:ay)?s?\s*ago/);
  if (daysMatch) {
    return new Date(now.getTime() - parseInt(daysMatch[1]) * 86400 * 1000);
  }

  const weeksMatch = text.match(/(\d+)\s*w(?:eek)?s?\s*ago/);
  if (weeksMatch) {
    return new Date(now.getTime() - parseInt(weeksMatch[1]) * 604800 * 1000);
  }

  // Platform-specific patterns
  if (text.includes('just posted') || text.includes('just now')) {
    return new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
  }

  if (text === 'today' || text.includes('posted today')) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return today;
  }

  // Glassdoor shorthand: "5h", "2d"
  const glassdoorHours = text.match(/^(\d+)h$/);
  if (glassdoorHours) {
    return new Date(now.getTime() - parseInt(glassdoorHours[1]) * 3600 * 1000);
  }

  const glassdoorDays = text.match(/^(\d+)d\+?$/);
  if (glassdoorDays) {
    return new Date(now.getTime() - parseInt(glassdoorDays[1]) * 86400 * 1000);
  }

  // Fallback: if we can't parse, assume it's old (30+ days)
  console.warn(`Could not parse posting date: "${raw}" from ${platform}`);
  return new Date(now.getTime() - 30 * 86400 * 1000);
}

export function isWithinLast24Hours(date: Date): boolean {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs <= 24 * 60 * 60 * 1000;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}
```

## 24-Hour Filter SQL Query

```sql
-- Get jobs posted within the last 24 hours
SELECT * FROM jobs
WHERE posted_at >= datetime('now', '-24 hours')
  AND is_expired = 0
ORDER BY posted_at DESC;

-- With profile matching
SELECT j.*, pjm.match_score, pjm.match_reasons
FROM jobs j
LEFT JOIN profile_job_matches pjm ON j.id = pjm.job_id
WHERE j.posted_at >= datetime('now', '-24 hours')
  AND j.is_expired = 0
  AND pjm.profile_id = ?
ORDER BY pjm.match_score DESC, j.posted_at DESC;
```

## Testing the Normalizer

Test cases that MUST pass:

```typescript
// test/unit/lib/date-utils.test.ts
describe('normalizePostingDate', () => {
  it('parses ISO 8601', () => {
    const d = normalizePostingDate('2026-02-12T10:30:00Z', 'dice');
    expect(d.toISOString()).toBe('2026-02-12T10:30:00.000Z');
  });

  it('parses "X hours ago"', () => {
    const d = normalizePostingDate('3 hours ago', 'indeed');
    const expected = Date.now() - 3 * 3600 * 1000;
    expect(Math.abs(d.getTime() - expected)).toBeLessThan(5000);
  });

  it('parses Glassdoor "5h"', () => {
    const d = normalizePostingDate('5h', 'glassdoor');
    const expected = Date.now() - 5 * 3600 * 1000;
    expect(Math.abs(d.getTime() - expected)).toBeLessThan(5000);
  });

  it('parses "Just posted"', () => {
    const d = normalizePostingDate('Just posted', 'indeed');
    const expected = Date.now() - 30 * 60 * 1000;
    expect(Math.abs(d.getTime() - expected)).toBeLessThan(5000);
  });

  it('returns old date for unparseable input', () => {
    const d = normalizePostingDate('unknown format', 'other');
    expect(Date.now() - d.getTime()).toBeGreaterThan(29 * 86400 * 1000);
  });
});
```
