# Job Deduplication Strategy

Jobs appear on multiple platforms simultaneously. The portal must deduplicate them to avoid showing the same job 3-5 times.

## Dedup Hash Algorithm

```typescript
import { createHash } from 'crypto';

export function generateDedupHash(
  title: string,
  company: string,
  location: string
): string {
  // Normalize all three fields
  const normalizedTitle = normalizeText(title);
  const normalizedCompany = normalizeText(company);
  const normalizedLocation = normalizeLocation(location);

  // Create deterministic hash
  const input = `${normalizedTitle}|${normalizedCompany}|${normalizedLocation}`;
  return createHash('sha256').update(input).digest('hex');
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')    // Remove special chars
    .replace(/\s+/g, ' ')           // Collapse whitespace
    .replace(/\b(senior|sr|junior|jr|lead|staff|principal)\b/g, '') // Remove level prefixes
    .replace(/\b(i|ii|iii|iv|v)\b/g, '')  // Remove roman numerals
    .trim();
}

function normalizeLocation(location: string): string {
  const text = location.toLowerCase().trim();

  // Normalize "remote" variations
  if (text.includes('remote') || text.includes('anywhere') || text.includes('work from home')) {
    return 'remote';
  }

  // Normalize state abbreviations
  return text
    .replace(/\b(california|ca)\b/g, 'ca')
    .replace(/\b(new york|ny)\b/g, 'ny')
    .replace(/\b(texas|tx)\b/g, 'tx')
    // ... etc for all US states
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
```

## Dedup Conflict Resolution

When a duplicate is found (same dedup_hash), decide which record to keep:

```
Priority order for "source of truth":
1. Dice (most structured data, often has recruiter info)
2. Indeed (largest volume, good descriptions)
3. LinkedIn (best for recruiter profiles)
4. ZipRecruiter (good salary data)
5. Glassdoor (good salary estimates)
```

When merging:
- Keep the record with MORE data (longer description, has salary, has recruiter info)
- Update `scraped_at` to the latest timestamp
- Store ALL apply URLs (one per platform) so the user can choose where to apply
- Merge recruiter info: if one platform has email and another has phone, combine both

## Database Query for Dedup Check

```sql
-- Check before inserting a new job
SELECT id, platform, recruiter_name, salary_text
FROM jobs
WHERE dedup_hash = ?
LIMIT 1;
```

If found: update existing record with any new information (UPSERT pattern).
If not found: insert new record.

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Same job, different title on 2 platforms | Won't be caught by hash; accept as separate listings |
| Same title + company, different locations | Different hashes; keep both (different positions) |
| Staffing company posts same job 3 times | Same hash; dedup correctly |
| Job reposted after expiry | Same hash; update `posted_at` and `is_expired = false` |
| Company name varies ("Google" vs "Google LLC") | Normalize removes "LLC", "Inc", "Corp" — should match |
