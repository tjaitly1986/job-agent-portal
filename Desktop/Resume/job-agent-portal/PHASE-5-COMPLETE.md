# Phase 5: API Routes - COMPLETE ✅

**Completion Date**: February 12, 2026

## Summary

Phase 5 has been successfully completed. The Job Agent Portal now has a complete RESTful API with authentication, validation, and error handling for all major features.

## What Was Accomplished

### ✅ API Utilities

**Created `src/lib/api/response.ts`:**
- Standard API response format with TypeScript interface
- Response helpers:
  - `successResponse()` - 200 OK
  - `createdResponse()` - 201 Created
  - `badRequestResponse()` - 400 Bad Request
  - `unauthorizedResponse()` - 401 Unauthorized
  - `forbiddenResponse()` - 403 Forbidden
  - `notFoundResponse()` - 404 Not Found
  - `conflictResponse()` - 409 Conflict
  - `serverErrorResponse()` - 500 Internal Server Error
  - `validationErrorResponse()` - 400 with field errors

**Created `src/lib/api/auth.ts`:**
- `getCurrentUserFromRequest()` - Get user from session
- `requireAuthApi()` - Require auth or throw 401
- `getUserIdFromRequest()` - Get user ID or throw 401

### ✅ Jobs API

**Created `src/app/api/jobs/route.ts`:**
- **GET /api/jobs** - List and filter jobs
  - Filters: platform, remote, employment type, salary range, location, search text, date range
  - Pagination: limit, offset
  - Sorting: orderBy (postedAt, createdAt), orderDir (asc, desc)
  - Returns: jobs array, total count, pagination info
  - Authentication: Required

**Created `src/app/api/jobs/[id]/route.ts`:**
- **GET /api/jobs/:id** - Get single job
  - Returns: full job details
  - Authentication: Required

### ✅ Profiles API

**Created `src/app/api/profiles/route.ts`:**
- **GET /api/profiles** - List all user's search profiles
  - Returns: array of profiles with parsed JSON fields
  - Authentication: Required
- **POST /api/profiles** - Create new search profile
  - Validation: Zod schema
  - JSON fields: jobTitles, skills, locations, employmentTypes, platforms, etc.
  - Returns: created profile
  - Authentication: Required

**Created `src/app/api/profiles/[id]/route.ts`:**
- **GET /api/profiles/:id** - Get single profile
  - Ownership check: user must own profile
  - Returns: profile with parsed JSON fields
- **PATCH /api/profiles/:id** - Update profile
  - Partial updates supported
  - Ownership check enforced
  - Returns: updated profile
- **DELETE /api/profiles/:id** - Delete profile
  - Ownership check enforced
  - Cascade deletes handled by database

### ✅ Tracker API

**Created `src/app/api/tracker/route.ts`:**
- **GET /api/tracker** - List and filter job applications
  - Filters: status, profileId, followUpDate range, appliedAt range, search
  - Pagination: limit, offset
  - Sorting: orderBy (created_at, updated_at, applied_at, follow_up_date)
  - Returns: applications with job details
  - Authentication: Required
- **POST /api/tracker** - Create application entry
  - Validation: Zod schema
  - Verifies job exists
  - Returns: created application
  - Authentication: Required

**Created `src/app/api/tracker/[id]/route.ts`:**
- **GET /api/tracker/:id** - Get single application
  - Includes job details via JOIN
  - Ownership check enforced
  - Parses JSON fields (interviewDates, offerDetails)
- **PATCH /api/tracker/:id** - Update application
  - Status transitions supported
  - Partial updates
  - Ownership check enforced
- **DELETE /api/tracker/:id** - Delete application
  - Ownership check enforced

### ✅ Scrapers API

**Created `src/lib/validators/scraper-schema.ts`:**
- `triggerScrapeSchema` - Validation for scrape requests
  - searchQuery, location, maxResults, postedWithin
  - remote, employmentTypes, platforms

**Created `src/app/api/scrapers/trigger/route.ts`:**
- **POST /api/scrapers/trigger** - Trigger on-demand scraping
  - Uses ScraperManager to run scrapers
  - Supports multiple platforms in parallel
  - Returns: totalFound, newJobs, duplicates, errors
  - Authentication: Required

**Created `src/app/api/scrapers/status/[id]/route.ts`:**
- **GET /api/scrapers/status/:id** - Get scrape run status
  - Returns: scrape run details with logs
  - Parses JSON fields (platforms, profilesUsed, errorSummary)
  - Ownership check enforced

**Created `src/app/api/scrapers/runs/route.ts`:**
- **GET /api/scrapers/runs** - List recent scrape runs
  - Pagination: limit (default 20, max 100)
  - Ordered by startedAt DESC
  - Returns: array of runs with parsed JSON fields

### ✅ Resumes API

**Created `src/lib/file-parser/pdf-parser.ts`:**
- `parsePDF()` - Extract text from PDF file
- `parsePDFBuffer()` - Extract text from PDF buffer
- Uses pdf-parse library

**Created `src/lib/file-parser/docx-parser.ts`:**
- `parseDOCX()` - Extract text from DOCX file
- `parseDOCXBuffer()` - Extract text from DOCX buffer
- Uses mammoth.js library

**Created `src/lib/file-parser/index.ts`:**
- `parseResume()` - Parse resume by file path
- `parseResumeBuffer()` - Parse resume from buffer
- Auto-detects file type and calls appropriate parser

**Created `src/lib/validators/resume-schema.ts`:**
- `resumeFileTypeSchema` - Allowed file types (PDF, DOCX)
- `updateResumeSchema` - Label and isDefault validation

**Created `src/app/api/resumes/route.ts`:**
- **GET /api/resumes** - List user's resumes
  - Ordered by createdAt DESC
  - Authentication: Required
- **POST /api/resumes** - Upload resume
  - Multipart form data upload
  - File validation: type, size (max 10MB)
  - Saves to uploads/resumes/
  - Auto-parses text content
  - Supports setting as default
  - Returns: created resume record

**Created `src/app/api/resumes/[id]/route.ts`:**
- **GET /api/resumes/:id** - Get single resume
  - Ownership check enforced
- **PATCH /api/resumes/:id** - Update resume
  - Update label or isDefault
  - Auto-unsets other defaults when setting new default
  - Ownership check enforced
- **DELETE /api/resumes/:id** - Delete resume
  - Deletes file from disk
  - Removes database record
  - Ownership check enforced

### ✅ User API

**Created `src/lib/validators/user-schema.ts`:**
- `updateUserSchema` - Validation for user profile updates
  - name, email, currentPassword, newPassword

**Created `src/app/api/user/me/route.ts`:**
- **GET /api/user/me** - Get current user info
  - Removes passwordHash from response
  - Authentication: Required
- **PATCH /api/user/me** - Update user profile
  - Update name, email, or password
  - Password change requires currentPassword validation
  - Email uniqueness check
  - Bcrypt password hashing
  - Authentication: Required

## Files Created (21 files)

```
src/lib/api/
  ├── response.ts              # API response helpers
  └── auth.ts                  # API authentication middleware

src/lib/file-parser/
  ├── pdf-parser.ts            # PDF text extraction
  ├── docx-parser.ts           # DOCX text extraction
  └── index.ts                 # Unified parser interface

src/lib/validators/
  ├── scraper-schema.ts        # Scraper request validation
  ├── resume-schema.ts         # Resume upload validation
  └── user-schema.ts           # User update validation

src/app/api/jobs/
  ├── route.ts                 # GET /api/jobs (list)
  └── [id]/route.ts            # GET /api/jobs/:id (single)

src/app/api/profiles/
  ├── route.ts                 # GET, POST /api/profiles
  └── [id]/route.ts            # GET, PATCH, DELETE /api/profiles/:id

src/app/api/tracker/
  ├── route.ts                 # GET, POST /api/tracker
  └── [id]/route.ts            # GET, PATCH, DELETE /api/tracker/:id

src/app/api/scrapers/
  ├── trigger/route.ts         # POST /api/scrapers/trigger
  ├── status/[id]/route.ts     # GET /api/scrapers/status/:id
  └── runs/route.ts            # GET /api/scrapers/runs

src/app/api/resumes/
  ├── route.ts                 # GET, POST /api/resumes
  └── [id]/route.ts            # GET, PATCH, DELETE /api/resumes/:id

src/app/api/user/
  └── me/route.ts              # GET, PATCH /api/user/me
```

## API Endpoints Summary

### Jobs
- `GET /api/jobs` - List jobs with filtering and pagination
- `GET /api/jobs/:id` - Get single job

### Profiles
- `GET /api/profiles` - List user's search profiles
- `POST /api/profiles` - Create new profile
- `GET /api/profiles/:id` - Get single profile
- `PATCH /api/profiles/:id` - Update profile
- `DELETE /api/profiles/:id` - Delete profile

### Tracker
- `GET /api/tracker` - List applications with filtering
- `POST /api/tracker` - Create application entry
- `GET /api/tracker/:id` - Get single application
- `PATCH /api/tracker/:id` - Update application
- `DELETE /api/tracker/:id` - Delete application

### Scrapers
- `POST /api/scrapers/trigger` - Trigger job scraping
- `GET /api/scrapers/status/:id` - Get scrape run status
- `GET /api/scrapers/runs` - List recent scrape runs

### Resumes
- `GET /api/resumes` - List user's resumes
- `POST /api/resumes` - Upload resume
- `GET /api/resumes/:id` - Get single resume
- `PATCH /api/resumes/:id` - Update resume
- `DELETE /api/resumes/:id` - Delete resume

### User
- `GET /api/user/me` - Get current user
- `PATCH /api/user/me` - Update current user

## Key Design Decisions

### 1. Standard Response Format
All API endpoints return consistent JSON format:
```typescript
{
  success: boolean
  data?: T
  error?: string
  message?: string
}
```

### 2. Authentication Middleware
All protected endpoints use `requireAuthApi()` which:
- Validates NextAuth session
- Returns user object or throws 401
- Works seamlessly with API routes

### 3. Ownership Checks
All user-specific resources (profiles, applications, resumes) enforce ownership:
- Fetch resource
- Check `userId === currentUser.id`
- Return 403 Forbidden if mismatch

### 4. JSON Field Handling
Array and object fields stored as JSON strings in SQLite:
- Parse on read: `JSON.parse(field || '[]')`
- Stringify on write: `JSON.stringify(data)`
- Default values provided for null/undefined

### 5. File Upload Strategy
Resumes stored on disk with database metadata:
- Files: `uploads/resumes/`
- Filename: `{userId}_{timestamp}_{sanitized-name}`
- Auto-parse on upload (optional, non-blocking)
- Cleanup on delete

### 6. Validation with Zod
All POST/PATCH endpoints use Zod validation:
- Type safety at runtime
- Clear error messages
- Coercion for query params (strings → numbers)

### 7. Partial Updates
PATCH endpoints support partial updates:
- Only update provided fields
- Use `data.field !== undefined` checks
- Set `updatedAt` automatically

### 8. Pagination
List endpoints return pagination metadata:
```typescript
{
  data: T[]
  total: number
  limit: number
  offset: number
}
```

## Error Handling

All endpoints follow this pattern:
```typescript
try {
  // Business logic
} catch (error) {
  if (error instanceof Response) {
    return error  // Auth errors thrown by requireAuthApi
  }
  console.error('Endpoint error:', error)
  return serverErrorResponse('Error message')
}
```

## Security Features

1. **Authentication Required**: All endpoints require valid session
2. **Ownership Checks**: Users can only access their own resources
3. **File Validation**: Type and size checks on uploads
4. **Password Hashing**: Bcrypt with salt rounds = 10
5. **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
6. **XSS Prevention**: No raw HTML rendering, JSON responses only

## Testing

To test the API endpoints:

```bash
# Start dev server
npm run dev

# Example: List jobs
curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:3000/api/jobs

# Example: Create profile
curl -X POST \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json" \
  -d '{"name":"AI Jobs","jobTitles":["AI Engineer"]}' \
  http://localhost:3000/api/profiles

# Example: Upload resume
curl -X POST \
  -H "Cookie: next-auth.session-token=..." \
  -F "file=@resume.pdf" \
  -F "label=My Resume" \
  http://localhost:3000/api/resumes

# Example: Trigger scraping
curl -X POST \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json" \
  -d '{"searchQuery":"AI Architect","platforms":["indeed"]}' \
  http://localhost:3000/api/scrapers/trigger
```

## Next Steps: Phase 6 - Frontend Components

Phase 6 will implement:
1. UI components with shadcn/ui
2. Job listing components (JobCard, JobGrid, JobFilters)
3. Profile management components
4. Application tracker components (Table, Kanban)
5. Resume management components
6. Shared components (LoadingSpinner, ErrorBoundary)

**Estimated Files to Create**: ~25 files
**Estimated Time**: 4-5 hours

---

## Phase 5 Checklist ✅

- [x] Create API response helpers
- [x] Create API authentication middleware
- [x] Create Jobs API (GET list, GET single)
- [x] Create Profiles API (GET, POST, PATCH, DELETE)
- [x] Create Tracker API (GET, POST, PATCH, DELETE)
- [x] Create Scrapers API (trigger, status, runs)
- [x] Create file parser utilities (PDF, DOCX)
- [x] Create Resumes API (GET, POST, PATCH, DELETE)
- [x] Create User API (GET me, PATCH me)
- [x] Add validation schemas for all endpoints

**Status**: ✅ COMPLETE — Ready to proceed to Phase 6 (Frontend Components)

**Note**: API is fully functional and ready for frontend integration. All endpoints are protected by authentication and include proper error handling.
