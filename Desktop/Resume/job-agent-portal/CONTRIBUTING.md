# Contributing to Job Agent Portal

## Prerequisites

- Node.js >= 18.17.0
- npm >= 9.0.0

## Setup

```bash
git clone https://github.com/tjaitly1986/job-agent-portal.git
cd job-agent-portal
npm install
cp .env.example .env.local   # Fill in required values
npm run db:migrate
npm run dev                   # http://localhost:3000
```

## Branch Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```
2. Branch prefixes: `feature/`, `fix/`, `refactor/`, `chore/`
3. Make changes, commit with conventional commits
4. Push and open a PR against `main`

## Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat: add job deduplication logic
fix: correct date parsing for Indeed listings
refactor: extract scraper base class
chore: update dependencies
docs: add CI/CD section to CLAUDE.md
test: add unit tests for rate limiter
```

## Pull Request Process

1. Fill out the PR template completely
2. CI must pass — **Lint**, **Type Check**, and **Build** are required checks
3. Claude will post an advisory code review comment automatically
4. Address any CI failures before requesting merge

## Required Checks

| Check | Command | Required |
|-------|---------|----------|
| Lint | `npm run lint` + `npm run format:check` | Yes |
| Type Check | `npm run type-check` | Yes |
| Build | `npm run build` | Yes |
| Unit Tests | `npx vitest run --passWithNoTests` | No |
| Claude Review | Automatic | Advisory |

## Local Quality Checks

Husky pre-commit hooks run lint-staged automatically. You can also run manually:

```bash
npm run lint          # ESLint
npm run format:check  # Prettier check
npm run type-check    # TypeScript strict mode
npx vitest run        # Unit tests
npm run build         # Full production build
```

## Code Style

See [CLAUDE.md](./CLAUDE.md) for the full coding standards, including:

- TypeScript strict mode
- `interface` over `type` for object shapes
- Zod for runtime validation
- kebab-case files, PascalCase components, camelCase functions
- Server Components by default

## Test Structure

```
tests/
├── unit/          # Vitest unit tests
│   ├── scrapers/
│   ├── lib/
│   └── components/
├── integration/
│   └── api/
└── e2e/
    └── flows/     # Playwright E2E tests
```

Place unit tests next to the code they test, or in the `tests/` directory mirroring the `src/` structure.
