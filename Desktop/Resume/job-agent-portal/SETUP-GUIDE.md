# Setup Guide — Job Agent Portal

Step-by-step guide to set up the development environment and get the portal running locally.

## Prerequisites

| Requirement | Version | Check Command |
|------------|---------|---------------|
| Node.js | 20.x+ | `node --version` |
| npm | 10.x+ | `npm --version` |
| Git | 2.x+ | `git --version` |
| Python | 3.10+ (optional, for scraper testing scripts) | `python3 --version` |

## Step 1: Initialize the Project

```bash
# Create Next.js project with TypeScript, Tailwind, App Router, ESLint
npx create-next-app@latest job-agent-portal \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm

cd job-agent-portal
```

## Step 2: Install Dependencies

```bash
# Core dependencies
npm install next-auth@beta @auth/drizzle-adapter drizzle-orm better-sqlite3
npm install @anthropic-ai/sdk                       # Claude API
npm install zustand @tanstack/react-query            # State management
npm install zod                                      # Validation
npm install bcryptjs                                 # Password hashing
npm install node-cron                                # Scheduling
npm install pdf-parse mammoth                        # File parsing
npm install bullmq ioredis                           # Job queue (optional)
npm install lucide-react                             # Icons
npm install class-variance-authority clsx tailwind-merge # shadcn/ui utilities

# Dev dependencies
npm install -D drizzle-kit                           # Drizzle migrations
npm install -D @types/better-sqlite3 @types/bcryptjs @types/node-cron
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test                      # E2E testing
npm install -D prettier eslint-config-prettier
npm install -D husky                                 # Git hooks
```

## Step 3: Initialize shadcn/ui

```bash
npx shadcn@latest init

# When prompted:
# Style: Default
# Base color: Slate
# CSS variables: Yes

# Install commonly needed components
npx shadcn@latest add button card input label select textarea
npx shadcn@latest add dialog dropdown-menu popover tooltip
npx shadcn@latest add table tabs badge separator
npx shadcn@latest add avatar skeleton scroll-area
npx shadcn@latest add command sheet sidebar
npx shadcn@latest add form toast sonner
```

## Step 4: Set Up MCP Servers

### Bright Data MCP

```bash
# Install the Bright Data MCP server for Claude Code
npx @anthropic-ai/claude-code mcp add bright-data -- npx @anthropic-ai/mcp-server-bright-data

# Verify it's configured
# Check .claude/settings.json for the bright-data entry
```

To get your Bright Data credentials:
1. Sign up at https://brightdata.com
2. Navigate to Dashboard → API Keys
3. Create a new API key with "Scraping Browser" and "Web Scraper" permissions
4. Copy the API key and Browser Auth token

### Playwright MCP

```bash
# Install the Playwright MCP server for Claude Code
npx @anthropic-ai/claude-code mcp add playwright -- npx @anthropic-ai/mcp-server-playwright

# Install browser binaries for E2E testing
npx playwright install chromium
```

## Step 5: Environment Variables

```bash
# Copy the example env file
cp .env.example .env.local
```

Create `.env.example` with these contents:

```env
# ==========================================
# Job Agent Portal — Environment Variables
# ==========================================

# --- Authentication ---
NEXTAUTH_SECRET=your-random-secret-at-least-32-chars
NEXTAUTH_URL=http://localhost:3000

# --- Bright Data MCP ---
BRIGHT_DATA_API_KEY=your-bright-data-api-key
BRIGHT_DATA_BROWSER_AUTH=your-bright-data-browser-auth
BRIGHT_DATA_CUSTOMER_ID=your-customer-id
BRIGHT_DATA_ZONE=scraping_browser

# --- Playwright MCP ---
PLAYWRIGHT_MCP_URL=ws://localhost:3001
PLAYWRIGHT_HEADLESS=true

# --- Anthropic Claude API ---
ANTHROPIC_API_KEY=your-anthropic-api-key

# --- Database ---
DATABASE_URL=file:./data/portal.sqlite

# --- Scheduler ---
CRON_SCHEDULE=0 */6 * * *
# REDIS_URL=redis://localhost:6379   # Optional: for BullMQ

# --- OAuth (Optional) ---
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=

# --- File Upload ---
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

Fill in `.env.local` with your actual API keys.

## Step 6: Set Up Database

```bash
# Create the data directory
mkdir -p data

# Create the Drizzle config file
# (This should already exist from the project template)

# Generate initial migration
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit push

# Seed with sample data (optional)
npx tsx scripts/seed-db.ts
```

### `drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./data/portal.sqlite',
  },
});
```

## Step 7: Configure Git Hooks

```bash
# Initialize Husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "bash hooks/pre-commit.sh"

# Add pre-push hook
npx husky add .husky/pre-push "bash hooks/pre-push.sh"

# Make hook scripts executable
chmod +x hooks/pre-commit.sh hooks/pre-push.sh
```

## Step 8: Create Upload Directories

```bash
mkdir -p uploads
echo "uploads/" >> .gitignore
echo "data/" >> .gitignore
echo ".env.local" >> .gitignore
```

## Step 9: Configure TypeScript

Update `tsconfig.json` for strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Step 10: Start Development

```bash
# Start the Next.js dev server
npm run dev

# Open in browser
open http://localhost:3000
```

## Recommended `package.json` Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint src/ --ext .ts,.tsx --max-warnings=0",
    "format": "prettier --write 'src/**/*.{ts,tsx,css,json}'",
    "format:check": "prettier --check 'src/**/*.{ts,tsx,css,json}'",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx scripts/seed-db.ts",
    "test:scraper": "tsx scripts/test-scrapers.ts",
    "prepare": "husky install || true"
  }
}
```

## Folder Creation Checklist

After running `create-next-app`, create these additional directories:

```bash
# Source directories
mkdir -p src/app/\(auth\)/login
mkdir -p src/app/\(auth\)/register
mkdir -p src/app/\(dashboard\)/jobs/\[id\]
mkdir -p src/app/\(dashboard\)/profiles
mkdir -p src/app/\(dashboard\)/tracker
mkdir -p src/app/\(dashboard\)/resumes
mkdir -p src/app/\(dashboard\)/chat
mkdir -p src/app/\(dashboard\)/settings
mkdir -p src/app/api/jobs/\[id\]
mkdir -p src/app/api/jobs/search
mkdir -p src/app/api/profiles/\[id\]
mkdir -p src/app/api/tracker/\[id\]
mkdir -p src/app/api/resumes/parse
mkdir -p src/app/api/chat/conversations/\[id\]
mkdir -p src/app/api/scrapers/trigger
mkdir -p src/app/api/scrapers/status/\[runId\]
mkdir -p src/app/api/recruiters/\[id\]
mkdir -p src/components/ui
mkdir -p src/components/jobs
mkdir -p src/components/profiles
mkdir -p src/components/tracker
mkdir -p src/components/resumes
mkdir -p src/components/chat
mkdir -p src/components/layout
mkdir -p src/components/shared
mkdir -p src/lib/db/migrations
mkdir -p src/lib/mcp
mkdir -p src/lib/scrapers
mkdir -p src/lib/ai
mkdir -p src/lib/auth
mkdir -p src/lib/scheduler
mkdir -p src/lib/file-parser
mkdir -p src/lib/utils
mkdir -p src/lib/validators
mkdir -p src/hooks
mkdir -p src/stores
mkdir -p src/types
mkdir -p scripts
mkdir -p mcp-config
mkdir -p hooks
mkdir -p tests/unit/scrapers
mkdir -p tests/unit/lib
mkdir -p tests/unit/components
mkdir -p tests/integration/api
mkdir -p tests/e2e/flows
mkdir -p data
mkdir -p uploads
mkdir -p public/assets
```

## Verification

After setup, verify everything works:

```bash
# 1. Dev server starts
npm run dev
# Should see: Ready on http://localhost:3000

# 2. TypeScript compiles
npm run type-check
# Should pass with no errors

# 3. Linting passes
npm run lint
# Should pass (may show warnings for unused imports initially)

# 4. Database is reachable
npx tsx -e "
  const Database = require('better-sqlite3');
  const db = new Database('./data/portal.sqlite');
  console.log('Database OK:', db.pragma('journal_mode', { simple: true }));
  db.close();
"

# 5. Bright Data MCP is configured
# In Claude Code, try: "List MCP servers"
# Should show bright-data and playwright

# 6. Anthropic API key works
npx tsx -e "
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();
  client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Say hello' }]
  }).then(r => console.log('Claude API OK:', r.content[0].text));
"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `better-sqlite3` build fails | Install build tools: `npm install -g node-gyp` + ensure Python 3 is available |
| MCP server not connecting | Check `.claude/settings.json` for correct command/args paths |
| Bright Data 401 error | Verify `BRIGHT_DATA_API_KEY` is correct and has scraping permissions |
| Next.js build fails | Run `npm run type-check` to find TypeScript errors |
| Database locked error | Ensure only one dev server instance is running |
| Port 3000 in use | Kill the process: `lsof -ti:3000 | xargs kill -9` or use `npm run dev -- -p 3001` |
