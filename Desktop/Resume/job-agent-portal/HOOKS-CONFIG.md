# Hooks Configuration — Job Agent Portal

This document covers two types of hooks:

1. **Claude Code Hooks** — Automated actions triggered during Claude Code development sessions
2. **Git Hooks** — Pre-commit and pre-push validation

## Claude Code Hooks

Claude Code hooks are configured in `.claude/settings.json` under the `hooks` key. These run automatically during development.

### Configuration File: `.claude/settings.json`

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
    },
    "playwright": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-server-playwright"],
      "env": {
        "PLAYWRIGHT_HEADLESS": "true"
      }
    }
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Reminder: Check CLAUDE.md for naming conventions and code style before writing files.'"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "file=\"$CLAUDE_FILE_PATH\"; if [[ \"$file\" == *.ts || \"$file\" == *.tsx ]]; then npx tsc --noEmit \"$file\" 2>&1 | head -20; fi"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Command completed. Check for any errors above.'"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "echo '\\a'"
          }
        ]
      }
    ]
  },
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npx *)",
      "Bash(node *)",
      "Bash(git *)",
      "Bash(mkdir *)",
      "Bash(ls *)",
      "Bash(cat *)",
      "Bash(pip install *)",
      "mcp__bright-data__*",
      "mcp__playwright__*"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(sudo *)",
      "Bash(chmod 777 *)"
    ]
  }
}
```

### Hook Explanations

#### PreToolUse: Write/Edit Reminder
Triggers before any file write or edit operation. Reminds Claude Code to check naming conventions and code style from CLAUDE.md.

#### PostToolUse: TypeScript Check
After writing/editing any `.ts` or `.tsx` file, automatically runs the TypeScript compiler in `--noEmit` mode to catch type errors immediately.

#### PostToolUse: Bash Echo
After any Bash command, prints a reminder to check for errors. Helps catch silent failures.

#### Notification: Bell
Plays a terminal bell sound when Claude Code completes a long-running task.

### Custom Development Hooks

Create these in the project's `hooks/` directory:

#### `hooks/validate-scraper.sh`

Run after writing any scraper file to validate the structure:

```bash
#!/bin/bash
# hooks/validate-scraper.sh
# Validates that a scraper file follows the BaseScraper pattern

FILE="$1"

if [[ ! "$FILE" == *"scrapers/"* ]]; then
  exit 0  # Not a scraper file, skip
fi

echo "Validating scraper: $FILE"

# Check required exports
if ! grep -q "export class.*extends BaseScraper" "$FILE"; then
  echo "ERROR: Scraper must extend BaseScraper"
  exit 1
fi

# Check required methods
for method in "platform" "search" "getJobDetail"; do
  if ! grep -q "$method" "$FILE"; then
    echo "ERROR: Scraper missing required method: $method"
    exit 1
  fi
done

# Check rate limiter usage
if ! grep -q "respectRateLimit\|rateLimiter" "$FILE"; then
  echo "WARNING: Scraper should use rate limiting"
fi

echo "Scraper validation passed."
```

#### `hooks/check-env.sh`

Validate environment variables before starting:

```bash
#!/bin/bash
# hooks/check-env.sh
# Validates required environment variables are set

REQUIRED_VARS=(
  "BRIGHT_DATA_API_KEY"
  "ANTHROPIC_API_KEY"
  "NEXTAUTH_SECRET"
  "DATABASE_URL"
)

MISSING=0

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "ERROR: Missing required environment variable: $var"
    MISSING=1
  fi
done

if [[ $MISSING -eq 1 ]]; then
  echo ""
  echo "Copy .env.example to .env.local and fill in the values."
  exit 1
fi

echo "All required environment variables are set."
```

#### `hooks/validate-schema.sh`

After modifying database schema, validate migrations:

```bash
#!/bin/bash
# hooks/validate-schema.sh
# Validates Drizzle schema changes

echo "Checking Drizzle schema..."

# Generate migration diff
npx drizzle-kit generate 2>&1

if [[ $? -ne 0 ]]; then
  echo "ERROR: Schema generation failed. Check src/lib/db/schema.ts"
  exit 1
fi

echo "Schema validation passed."
```

## Git Hooks

### Pre-Commit Hook: `hooks/pre-commit.sh`

```bash
#!/bin/bash
# hooks/pre-commit.sh
# Runs before every git commit

set -e

echo "Running pre-commit checks..."

# 1. TypeScript type check
echo "[1/5] TypeScript type check..."
npx tsc --noEmit
if [[ $? -ne 0 ]]; then
  echo "FAIL: TypeScript errors found. Fix them before committing."
  exit 1
fi

# 2. ESLint
echo "[2/5] ESLint..."
npx eslint src/ --ext .ts,.tsx --max-warnings=0
if [[ $? -ne 0 ]]; then
  echo "FAIL: ESLint errors found."
  exit 1
fi

# 3. Prettier format check
echo "[3/5] Prettier format check..."
npx prettier --check "src/**/*.{ts,tsx,css,json}"
if [[ $? -ne 0 ]]; then
  echo "FAIL: Formatting issues found. Run 'npm run format' to fix."
  exit 1
fi

# 4. Check for sensitive data
echo "[4/5] Checking for sensitive data..."
SENSITIVE_PATTERNS="(BRIGHT_DATA_API_KEY|ANTHROPIC_API_KEY|password|secret|api_key|access_token)=['\"][^'\"]+['\"]"
if git diff --cached --diff-filter=ACMR | grep -iP "$SENSITIVE_PATTERNS"; then
  echo "FAIL: Potential sensitive data detected in staged files!"
  echo "Remove API keys, passwords, and secrets before committing."
  exit 1
fi

# 5. Check no .env files are being committed
echo "[5/5] Checking for .env files..."
if git diff --cached --name-only | grep -E "^\.env(\.|$)" | grep -v "\.env\.example$"; then
  echo "FAIL: .env files should not be committed. Add them to .gitignore."
  exit 1
fi

echo "All pre-commit checks passed!"
```

### Pre-Push Hook: `hooks/pre-push.sh`

```bash
#!/bin/bash
# hooks/pre-push.sh
# Runs before every git push

set -e

echo "Running pre-push checks..."

# 1. Run unit tests
echo "[1/3] Running unit tests..."
npx vitest run --reporter=verbose
if [[ $? -ne 0 ]]; then
  echo "FAIL: Unit tests failed. Fix them before pushing."
  exit 1
fi

# 2. Build check
echo "[2/3] Build check..."
npm run build
if [[ $? -ne 0 ]]; then
  echo "FAIL: Build failed."
  exit 1
fi

# 3. Database migration check
echo "[3/3] Checking for pending migrations..."
PENDING=$(npx drizzle-kit check 2>&1)
if echo "$PENDING" | grep -q "pending"; then
  echo "WARNING: There are pending database migrations."
  echo "Run 'npm run db:migrate' before deploying."
fi

echo "All pre-push checks passed!"
```

### Installing Git Hooks

Add to `package.json`:

```json
{
  "scripts": {
    "prepare": "husky install || true",
    "postinstall": "husky install || true"
  },
  "devDependencies": {
    "husky": "^9.0.0"
  }
}
```

Or use the manual approach:

```bash
# Make hooks executable
chmod +x hooks/pre-commit.sh hooks/pre-push.sh

# Configure git to use the hooks directory
git config core.hooksPath hooks/

# Or symlink individual hooks
ln -sf ../../hooks/pre-commit.sh .git/hooks/pre-commit
ln -sf ../../hooks/pre-push.sh .git/hooks/pre-push
```

## CI/CD Integration

### GitHub Actions: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx eslint src/ --ext .ts,.tsx --max-warnings=0
      - run: npx prettier --check "src/**/*.{ts,tsx,css,json}"

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx vitest run --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  build:
    runs-on: ubuntu-latest
    needs: [lint-and-type-check, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: .next/

  e2e:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## Hook Development Guidelines

When adding new hooks:

1. Always make scripts executable: `chmod +x hooks/script.sh`
2. Use `set -e` for fail-fast behavior
3. Print clear success/failure messages
4. Exit with code 0 on success, non-zero on failure
5. Keep hooks fast (< 30 seconds) to avoid developer friction
6. Log warnings (non-blocking) vs errors (blocking) appropriately
7. Test hooks locally before adding to CI
