# Job Agent Portal

AI-powered job aggregation platform that scrapes jobs from all major US job boards, with intelligent filtering, application tracking, and AI-powered outreach tools.

## Features

- **Multi-Platform Job Aggregation** — Scrape jobs from Indeed, Dice, Glassdoor, ZipRecruiter, and LinkedIn
- **24-Hour Filtering** — Focus on jobs posted in the last 24 hours across all platforms
- **Search Profiles** — Create and manage multiple search profiles with job titles, skills, and location preferences
- **Application Tracker** — Full-featured Kanban board and table view for tracking your job applications
- **Resume & Cover Letter Management** — Upload, parse, and manage your resumes and cover letters
- **Recruiter Contact Details** — Automatically extract recruiter LinkedIn profiles, email, and phone numbers
- **AI-Powered Chatbot** — Generate personalized LinkedIn messages and cold outreach emails using Claude AI
- **Scheduled Scraping** — Automatic job fetching on a customizable schedule
- **Multi-User Authentication** — Secure user authentication with NextAuth.js

## Tech Stack

- **Frontend**: Next.js 14+, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, NextAuth.js v5
- **Database**: SQLite with Drizzle ORM
- **Job Scraping**: Bright Data MCP + Playwright MCP
- **AI**: Anthropic Claude API (Sonnet 4.5)
- **Scheduling**: node-cron + BullMQ
- **Testing**: Vitest + Playwright E2E

## Project Structure

```
job-agent-portal/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── jobs/              # Job-related components
│   │   ├── tracker/           # Application tracker components
│   │   └── chat/              # AI chatbot components
│   ├── lib/                   # Core libraries
│   │   ├── db/                # Database schema and migrations
│   │   ├── scrapers/          # Platform-specific scrapers
│   │   ├── mcp/               # MCP client wrappers
│   │   └── ai/                # Claude API integration
│   ├── hooks/                 # React custom hooks
│   ├── stores/                # Zustand state stores
│   └── types/                 # TypeScript type definitions
├── scripts/                   # Utility scripts
├── tests/                     # Test files
└── mcp-config/                # MCP server configurations
```

## Quick Start

### Prerequisites

- Node.js 18.17.0 or higher
- npm 9.0.0 or higher
- Bright Data account (for job scraping)
- Anthropic API key (for AI chatbot)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd job-agent-portal
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` and add your API keys:
```env
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
BRIGHT_DATA_API_KEY=<your-bright-data-key>
ANTHROPIC_API_KEY=<your-anthropic-key>
```

5. Run database migrations:
```bash
npm run db:migrate
```

6. (Optional) Seed the database with sample data:
```bash
npm run db:seed
```

7. Start the development server:
```bash
npm run dev
```

8. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run E2E tests
npm run test:coverage    # Generate coverage report

# Database
npm run db:generate      # Generate migrations from schema changes
npm run db:migrate       # Run pending migrations
npm run db:seed          # Seed database with sample data
npm run db:studio        # Open Drizzle Studio (database GUI)

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run type-check       # Run TypeScript type checking

# Scrapers
npm run test:scraper -- --platform=indeed      # Test Indeed scraper
npm run test:scraper -- --platform=linkedin    # Test LinkedIn scraper
```

## Environment Variables

See `.env.example` for a complete list of required environment variables.

### Required Variables

- `NEXTAUTH_SECRET` — Secret for NextAuth.js session encryption
- `BRIGHT_DATA_API_KEY` — Bright Data API key for job scraping
- `ANTHROPIC_API_KEY` — Anthropic API key for AI chatbot

### Optional Variables

- `REDIS_URL` — Redis connection URL for BullMQ (falls back to in-memory queue)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — GitHub OAuth credentials

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture and data flows
- [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) — Complete database schema
- [API-SPEC.md](./API-SPEC.md) — API endpoint specifications
- [MCP-CONFIG.md](./MCP-CONFIG.md) — MCP server setup and configuration
- [UI-COMPONENTS.md](./UI-COMPONENTS.md) — UI component library and wireframes
- [SETUP-GUIDE.md](./SETUP-GUIDE.md) — Detailed setup instructions

## Development Workflow

1. **Feature Development** — Create a new branch from `main`
2. **Code** — Write code following TypeScript strict mode and conventions
3. **Test** — Write tests for new features (unit + E2E)
4. **Lint** — Run `npm run lint` and fix any issues
5. **Type Check** — Run `npm run type-check`
6. **Commit** — Use conventional commit messages (`feat:`, `fix:`, etc.)
7. **Pull Request** — Create a PR with description and testing steps

## Key Features in Detail

### Job Scraping

The portal uses two MCP servers for scraping:

- **Bright Data MCP** — Primary method for structured scraping with proxy rotation
- **Playwright MCP** — Fallback for JavaScript-heavy sites requiring browser automation

Jobs are deduplicated across platforms using a hash of normalized title + company + location.

### 24-Hour Filter

All jobs are normalized to UTC timestamps. The platform handles platform-specific date formats:
- Indeed: "Just posted", "Today", "1 day ago"
- Dice: ISO timestamps
- LinkedIn: "X hours ago", "X minutes ago"
- Glassdoor: "Xd", "Xh"
- ZipRecruiter: "Posted today"

### Application Tracker

Track applications through the entire pipeline:
- Saved → Ready to Apply → Applied → Phone Screen → Interview → Technical → Offer/Rejected

Features:
- Kanban board with drag-and-drop
- Table view with sorting and filtering
- Notes and deadline tracking
- Status change history

### AI Chatbot

The chatbot generates personalized messages using:
- Your parsed resume content
- The specific job description
- Recruiter information (name, company, LinkedIn profile)

Supported message types:
- LinkedIn connection requests (300 char limit)
- LinkedIn InMail messages
- Cold outreach emails
- Follow-up emails

## Rate Limiting

Per-platform rate limits are enforced:
- **Indeed**: 2 requests/second
- **Dice**: 3 requests/second
- **LinkedIn**: 1 request/2 seconds (strictest)
- **Glassdoor**: 2 requests/second
- **ZipRecruiter**: 2 requests/second

## License

MIT

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
