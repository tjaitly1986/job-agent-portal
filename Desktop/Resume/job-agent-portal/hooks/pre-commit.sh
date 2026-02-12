#!/bin/bash
# Pre-commit hook for Job Agent Portal
# Runs TypeScript check, ESLint, Prettier, and sensitive data scan

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

# 4. Check for sensitive data in staged files
echo "[4/5] Checking for sensitive data..."
SENSITIVE_PATTERNS="(BRIGHT_DATA_API_KEY|ANTHROPIC_API_KEY|NEXTAUTH_SECRET|password|api_key|access_token|secret_key)=['\"][^'\"]+['\"]"
if git diff --cached --diff-filter=ACMR | grep -iP "$SENSITIVE_PATTERNS" 2>/dev/null; then
  echo "FAIL: Potential sensitive data detected in staged files!"
  echo "Remove API keys, passwords, and secrets before committing."
  exit 1
fi

# 5. Check no .env or sqlite files are staged
echo "[5/5] Checking for forbidden files..."
FORBIDDEN=$(git diff --cached --name-only | grep -E "(^\.env\.|\.sqlite$|node_modules/)" || true)
if [[ -n "$FORBIDDEN" ]]; then
  echo "FAIL: Forbidden files detected in staging:"
  echo "$FORBIDDEN"
  echo "Add these to .gitignore."
  exit 1
fi

echo "All pre-commit checks passed!"
