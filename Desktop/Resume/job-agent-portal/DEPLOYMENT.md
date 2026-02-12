# Deployment Guide

Complete guide for deploying the Job Agent Portal to production.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Deployment Options](#deployment-options)
- [Post-Deployment](#post-deployment)

## Prerequisites

### Required
- Node.js 18+ and npm
- Git
- Production domain (optional)

### For Job Scraping
- Bright Data account (API key)
- Playwright MCP server (optional)

### For AI Features
- Anthropic API key (optional)

## Environment Setup

### 1. Production Environment Variables

Create `.env.production`:

```env
# Authentication (REQUIRED)
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=https://your-domain.com

# Database (REQUIRED)
DATABASE_URL=file:./data/portal.sqlite

# Bright Data (Required for scraping)
BRIGHT_DATA_API_KEY=<your-api-key>
BRIGHT_DATA_CUSTOMER_ID=<your-customer-id>
BRIGHT_DATA_ZONE=scraping_browser

# Anthropic Claude API (Optional - for AI chat)
ANTHROPIC_API_KEY=<your-anthropic-api-key>

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

### 2. Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

## Database Setup

```bash
# Create data directory
mkdir -p data

# Run migrations
npm run db:migrate

# (Optional) Seed initial data
npm run db:seed
```

## Deployment Options

### Option 1: Vercel (Easiest)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Option 2: Docker + VPS

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

### Option 3: Traditional VPS (PM2)

```bash
# Build
npm run build

# Start with PM2
pm2 start npm --name job-agent-portal -- start
pm2 save
```

## Post-Deployment

### 1. Create Admin User

```bash
npm run db:seed
```

### 2. Set Up SSL/HTTPS

Use Certbot for free SSL certificates.

### 3. Monitor Logs

- Vercel: Dashboard logs
- Docker: `docker-compose logs -f`
- PM2: `pm2 logs`

---

For detailed deployment instructions, see the full README.md
