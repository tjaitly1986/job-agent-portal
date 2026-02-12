#!/bin/bash
# Pre-push hook for Job Agent Portal
# Runs unit tests and build verification before pushing

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
echo "[2/3] Verifying build..."
npm run build 2>&1
if [[ $? -ne 0 ]]; then
  echo "FAIL: Build failed. Fix errors before pushing."
  exit 1
fi

# 3. Database migration check
echo "[3/3] Checking for pending migrations..."
if npx drizzle-kit check 2>&1 | grep -q "pending"; then
  echo "WARNING: Pending database migrations detected."
  echo "Run 'npm run db:migrate' before deploying."
fi

echo "All pre-push checks passed!"
