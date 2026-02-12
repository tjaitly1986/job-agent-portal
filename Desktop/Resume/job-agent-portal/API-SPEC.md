# API Specification — Job Agent Portal

All API routes are Next.js App Router API routes located in `src/app/api/`. Every response follows a consistent shape.

## Response Format

```typescript
// Success response
{
  "success": true,
  "data": T,              // The response payload
  "meta": {               // Optional pagination/metadata
    "total": number,
    "page": number,
    "pageSize": number,
    "totalPages": number
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": string,       // Machine-readable error code
    "message": string     // Human-readable message
  }
}
```

## Authentication

All `/api/*` routes (except `/api/auth/*`) require authentication. Use NextAuth.js session validation.

```typescript
// Middleware: src/middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" }
});

export const config = {
  matcher: ["/api/((?!auth).*)"]  // Protect all API routes except auth
};
```

---

## Jobs API

### GET `/api/jobs`

List jobs with filtering, sorting, and pagination.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `pageSize` | number | 20 | Results per page (max 100) |
| `platform` | string | all | Filter by platform: "indeed", "dice", "glassdoor", "ziprecruiter", "linkedin" |
| `postedWithin` | string | "24h" | Time filter: "1h", "6h", "12h", "24h", "3d", "7d", "30d", "all" |
| `location` | string | — | Filter by location (partial match) |
| `isRemote` | boolean | — | Filter remote-only jobs |
| `search` | string | — | Full-text search across title, company, description |
| `company` | string | — | Filter by company name |
| `salaryMin` | number | — | Minimum salary/rate |
| `salaryMax` | number | — | Maximum salary/rate |
| `employmentType` | string | — | "contract", "c2c", "fulltime" |
| `profileId` | string | — | Show only jobs matching this search profile |
| `sortBy` | string | "posted_at" | Sort field: "posted_at", "salary_min", "match_score", "company" |
| `sortOrder` | string | "desc" | "asc" or "desc" |
| `excludeApplied` | boolean | false | Exclude jobs the user has already applied to |
| `excludeDismissed` | boolean | true | Exclude dismissed job matches |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "title": "AI Solution Architect",
      "company": "Acme Corp",
      "location": "Remote",
      "isRemote": true,
      "salaryText": "$85-95/hr",
      "salaryMin": 85,
      "salaryMax": 95,
      "salaryType": "hourly",
      "employmentType": "Contract Corp To Corp",
      "platform": "dice",
      "postedAt": "2026-02-12T10:00:00Z",
      "postedAtRaw": "2 hours ago",
      "applyUrl": "https://www.dice.com/job-detail/abc123",
      "description": "We are looking for an AI Solution Architect...",
      "recruiter": {
        "name": "Jane Smith",
        "email": "jane@recruiting.com",
        "phone": "+1-555-0123",
        "linkedinUrl": "https://linkedin.com/in/janesmith"
      },
      "matchedProfiles": [
        {
          "profileId": "prof123",
          "profileName": "AI Solution Architect",
          "matchScore": 0.92,
          "matchReasons": ["title_match", "skills_match", "c2c_eligible"]
        }
      ],
      "application": null,
      "scrapedAt": "2026-02-12T12:00:00Z"
    }
  ],
  "meta": {
    "total": 156,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
  }
}
```

### GET `/api/jobs/[id]`

Get a single job with full details.

**Response:** Same shape as a single job object above, but with full `description` and `descriptionHtml`.

### POST `/api/jobs/search`

Trigger an on-demand job search across specified platforms.

**Request Body:**

```json
{
  "profileIds": ["prof123", "prof456"],     // Which profiles to search for
  "platforms": ["indeed", "dice", "linkedin"], // Which platforms (optional, defaults to all)
  "postedWithin": "24h"                     // Time filter (optional, defaults to 24h)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "scrapeRunId": "run123",
    "status": "running",
    "message": "Search started for 2 profiles across 3 platforms"
  }
}
```

### PATCH `/api/jobs/[id]`

Update a job (e.g., mark as expired, dismiss).

**Request Body:**

```json
{
  "isExpired": true
}
```

---

## Profiles API

### GET `/api/profiles`

List all search profiles for the current user.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "prof123",
      "name": "AI Solution Architect",
      "isActive": true,
      "jobTitles": ["AI Solution Architect", "AI Architect", "ML Architect"],
      "skills": ["Python", "TensorFlow", "AWS", "Solution Design"],
      "locations": ["United States"],
      "isRemote": true,
      "employmentTypes": ["contract", "c2c"],
      "excludeKeywords": ["security clearance", "US citizen only"],
      "includeKeywords": ["C2C", "Corp to Corp"],
      "platforms": ["indeed", "dice", "glassdoor", "ziprecruiter", "linkedin"],
      "domain": "AI",
      "lastSearched": "2026-02-12T10:00:00Z",
      "matchCount": 23
    }
  ]
}
```

### POST `/api/profiles`

Create a new search profile.

**Request Body:**

```json
{
  "name": "EDI Solution Architect",
  "jobTitles": ["EDI Solution Architect", "EDI Architect", "Integration Architect"],
  "skills": ["EDI", "AS2", "X12", "EDIFACT", "MuleSoft"],
  "locations": ["United States"],
  "isRemote": true,
  "employmentTypes": ["contract", "c2c"],
  "excludeKeywords": ["security clearance"],
  "includeKeywords": ["C2C", "Corp to Corp", "contract"],
  "platforms": ["indeed", "dice", "linkedin"],
  "domain": "EDI"
}
```

### PUT `/api/profiles/[id]`

Update an existing profile. Same body as POST.

### DELETE `/api/profiles/[id]`

Delete a search profile. Associated job matches are also deleted.

### PATCH `/api/profiles/[id]/toggle`

Toggle a profile's active status (include/exclude from searches).

**Request Body:**

```json
{
  "isActive": false
}
```

---

## Application Tracker API

### GET `/api/tracker`

List all tracked applications for the current user.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | all | Filter by status |
| `sortBy` | string | "updated_at" | Sort field |
| `sortOrder` | string | "desc" | "asc" or "desc" |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "app123",
      "job": {
        "id": "job456",
        "title": "AI Solution Architect",
        "company": "Acme Corp",
        "location": "Remote",
        "applyUrl": "https://dice.com/job-detail/abc",
        "platform": "dice"
      },
      "profile": {
        "id": "prof789",
        "name": "AI Solution Architect"
      },
      "status": "applied",
      "appliedAt": "2026-02-12T10:00:00Z",
      "appliedVia": "email",
      "resumeId": "res123",
      "coverLetterId": "cl123",
      "followUpDate": "2026-02-19T10:00:00Z",
      "notes": "Good fit, follow up in 1 week",
      "createdAt": "2026-02-12T09:30:00Z",
      "updatedAt": "2026-02-12T10:00:00Z"
    }
  ]
}
```

### POST `/api/tracker`

Create a new application tracking entry.

**Request Body:**

```json
{
  "jobId": "job456",
  "profileId": "prof789",
  "status": "applied",
  "appliedVia": "email",
  "resumeId": "res123",
  "coverLetterId": "cl123",
  "notes": "Good fit, follow up in 1 week"
}
```

### PATCH `/api/tracker/[id]`

Update an application's status or details.

**Request Body:**

```json
{
  "status": "interview",
  "notes": "Phone screen scheduled for Feb 15",
  "followUpDate": "2026-02-15T14:00:00Z"
}
```

### DELETE `/api/tracker/[id]`

Delete a tracked application.

### GET `/api/tracker/stats`

Get aggregate statistics for the user's job search.

**Response:**

```json
{
  "success": true,
  "data": {
    "totalApplications": 45,
    "byStatus": {
      "saved": 10,
      "ready_to_apply": 5,
      "applied": 20,
      "phone_screen": 3,
      "interview": 4,
      "offer": 1,
      "rejected": 2
    },
    "byPlatform": {
      "indeed": 15,
      "dice": 12,
      "linkedin": 10,
      "glassdoor": 5,
      "ziprecruiter": 3
    },
    "byDomain": {
      "AI": 25,
      "EDI": 10,
      "ERP": 8,
      "Cross-Domain": 2
    },
    "thisWeek": 12,
    "responseRate": 0.15,
    "averageResponseDays": 5.2
  }
}
```

---

## Resumes API

### GET `/api/resumes`

List all uploaded resumes for the current user.

### POST `/api/resumes`

Upload a new resume file (PDF or DOCX).

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | PDF or DOCX file (max 10MB) |
| `label` | string | No | User label for this resume |
| `isDefault` | boolean | No | Set as default resume |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "res123",
    "filename": "TJ_AI_Solution_Architect_Resume.pdf",
    "fileType": "pdf",
    "fileSize": 85432,
    "label": "AI Roles",
    "isDefault": true,
    "parsedTextPreview": "Tushar Jaitly — AI Solution Architect...",
    "createdAt": "2026-02-12T10:00:00Z"
  }
}
```

### POST `/api/resumes/parse`

Parse an uploaded resume and extract text. Called automatically after upload.

**Request Body:**

```json
{
  "resumeId": "res123"
}
```

**Response:** Updated resume object with `parsedText` populated.

### DELETE `/api/resumes/[id]`

Delete an uploaded resume and its file.

---

## Cover Letters API

### GET `/api/cover-letters`

List all uploaded cover letters.

### POST `/api/cover-letters`

Upload a cover letter (same pattern as resumes).

### DELETE `/api/cover-letters/[id]`

Delete a cover letter.

---

## Chat API

### POST `/api/chat`

Send a message to the AI chatbot and receive a streaming response.

**Request Body:**

```json
{
  "conversationId": "conv123",      // Optional: continue existing conversation
  "message": "Draft a LinkedIn connection request for this role",
  "messageType": "linkedin_request", // "linkedin_request", "linkedin_inmail", "email", "followup", "general"
  "context": {
    "jobId": "job456",               // Optional: attach job context
    "resumeId": "res123"             // Optional: which resume to use for context
  }
}
```

**Response:** Server-Sent Events (SSE) stream.

```
data: {"type": "start", "conversationId": "conv123"}
data: {"type": "delta", "content": "Hi "}
data: {"type": "delta", "content": "Jane, "}
data: {"type": "delta", "content": "I noticed..."}
data: {"type": "done", "messageId": "msg789", "tokensUsed": 245}
```

### GET `/api/chat/conversations`

List all chat conversations for the current user.

### GET `/api/chat/conversations/[id]`

Get all messages in a conversation.

### DELETE `/api/chat/conversations/[id]`

Delete a conversation and its messages.

---

## Scrapers API

### POST `/api/scrapers/trigger`

Trigger a scraping run.

**Request Body:**

```json
{
  "type": "on_demand",
  "profileIds": ["prof123"],
  "platforms": ["indeed", "dice"],
  "postedWithin": "24h"
}
```

### GET `/api/scrapers/status/[runId]`

Check the status of a scraping run.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "run123",
    "status": "completed",
    "totalFound": 47,
    "newJobs": 23,
    "errors": 1,
    "durationMs": 45000,
    "platformResults": {
      "indeed": { "found": 15, "new": 8, "errors": 0 },
      "dice": { "found": 20, "new": 12, "errors": 0 },
      "linkedin": { "found": 12, "new": 3, "errors": 1, "errorMessage": "Rate limited" }
    },
    "startedAt": "2026-02-12T10:00:00Z",
    "completedAt": "2026-02-12T10:00:45Z"
  }
}
```

---

## Recruiters API

### GET `/api/recruiters`

Search recruiter contacts across all jobs.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by name, email, or company |
| `jobId` | string | Get recruiter for a specific job |

### GET `/api/recruiters/[id]/linkedin`

Look up additional recruiter details from LinkedIn.

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "Jane Smith",
    "headline": "Senior Technical Recruiter at Acme Staffing",
    "linkedinUrl": "https://linkedin.com/in/janesmith",
    "profileImageUrl": null,
    "connectionDegree": "2nd"
  }
}
```

---

## Webhook / Scheduler API

### POST `/api/scrapers/schedule`

Set or update the scraping schedule.

**Request Body:**

```json
{
  "enabled": true,
  "cronExpression": "0 */6 * * *",
  "profileIds": ["prof123", "prof456"],
  "platforms": ["indeed", "dice", "glassdoor", "ziprecruiter", "linkedin"]
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Not authorized for this resource |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request body validation failed |
| `RATE_LIMITED` | 429 | Too many requests |
| `SCRAPE_FAILED` | 502 | Scraping operation failed |
| `MCP_ERROR` | 502 | MCP server communication error |
| `AI_ERROR` | 502 | Claude API error |
| `FILE_TOO_LARGE` | 413 | Uploaded file exceeds 10MB limit |
| `INVALID_FILE_TYPE` | 400 | Unsupported file format |
| `SERVER_ERROR` | 500 | Internal server error |
