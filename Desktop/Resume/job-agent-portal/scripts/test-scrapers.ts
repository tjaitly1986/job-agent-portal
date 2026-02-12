#!/usr/bin/env tsx

/**
 * Test script for job scrapers
 * Usage:
 *   npm run test:scraper -- --platform=indeed
 *   npm run test:scraper -- --platform=dice
 *   npm run test:scraper -- --platform=all
 */

import { scraperManager } from '../src/lib/scrapers/scraper-manager'
import { IndeedScraper } from '../src/lib/scrapers/indeed'
import { DiceScraper } from '../src/lib/scrapers/dice'
import { LinkedInScraper } from '../src/lib/scrapers/linkedin'

const args = process.argv.slice(2)
const platformArg = args.find((arg) => arg.startsWith('--platform='))
const platform = platformArg?.split('=')[1] || 'all'

async function testScraper() {
  console.log('='.repeat(60))
  console.log('JOB SCRAPER TEST')
  console.log('='.repeat(60))
  console.log()

  const searchQuery = 'AI Solution Architect'
  const location = 'United States'

  const options = {
    searchQuery,
    location,
    maxResults: 10,
    postedWithin: '24h' as const,
    remote: true,
    employmentTypes: ['contract', 'c2c'],
  }

  console.log('Search Parameters:')
  console.log(`  Query: ${searchQuery}`)
  console.log(`  Location: ${location}`)
  console.log(`  Posted Within: 24 hours`)
  console.log(`  Remote: Yes`)
  console.log(`  Employment Types: Contract, C2C`)
  console.log()

  if (platform === 'all') {
    console.log('Testing all platforms...')
    console.log()

    const result = await scraperManager.scrapeAll(options, ['indeed', 'dice', 'linkedin'])

    console.log()
    console.log('='.repeat(60))
    console.log('RESULTS')
    console.log('='.repeat(60))
    console.log(`Total Found: ${result.totalFound}`)
    console.log(`New Jobs: ${result.newJobs}`)
    console.log(`Duplicates: ${result.duplicates}`)
    console.log(`Errors: ${result.errors.length}`)

    if (result.errors.length > 0) {
      console.log()
      console.log('Errors:')
      result.errors.forEach((err) => console.log(`  - ${err}`))
    }
  } else {
    console.log(`Testing ${platform} scraper...`)
    console.log()

    let scraper
    switch (platform.toLowerCase()) {
      case 'indeed':
        scraper = new IndeedScraper()
        break
      case 'dice':
        scraper = new DiceScraper()
        break
      case 'linkedin':
        scraper = new LinkedInScraper()
        break
      default:
        console.error(`Unknown platform: ${platform}`)
        console.error('Valid platforms: indeed, dice, linkedin, all')
        process.exit(1)
    }

    const result = await scraper.scrape(options)

    console.log()
    console.log('='.repeat(60))
    console.log('RESULTS')
    console.log('='.repeat(60))
    console.log(`Jobs Found: ${result.totalFound}`)
    console.log(`New Jobs: ${result.newJobs}`)

    if (result.errors && result.errors.length > 0) {
      console.log(`Errors: ${result.errors.length}`)
      result.errors.forEach((err) => console.log(`  - ${err}`))
    }

    if (result.jobs.length > 0) {
      console.log()
      console.log('Sample Jobs:')
      result.jobs.slice(0, 3).forEach((job, idx) => {
        console.log(`\n${idx + 1}. ${job.title}`)
        console.log(`   Company: ${job.company}`)
        console.log(`   Location: ${job.location}`)
        console.log(`   Posted: ${job.postedAtRaw}`)
        console.log(`   Salary: ${job.salaryText || 'Not specified'}`)
        console.log(`   URL: ${job.applyUrl}`)
      })
    }
  }

  console.log()
  console.log('='.repeat(60))
  console.log('TEST COMPLETE')
  console.log('='.repeat(60))
}

testScraper().catch((error) => {
  console.error('Test failed:', error)
  process.exit(1)
})
