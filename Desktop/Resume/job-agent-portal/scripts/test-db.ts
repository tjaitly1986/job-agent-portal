import { db } from '../src/lib/db'
import { users, searchProfiles, jobs, jobApplications } from '../src/lib/db/schema'
import { eq, count } from 'drizzle-orm'

async function testDatabase() {
  console.log('🧪 Testing database connection and queries...\n')

  try {
    // Test 1: Count users
    const userCount = await db.select({ count: count() }).from(users)
    console.log(`✅ Users: ${userCount[0].count}`)

    // Test 2: Fetch user
    const testUser = await db.select().from(users).where(eq(users.email, 'test@example.com'))
    console.log(`✅ Test user found: ${testUser[0]?.name} (${testUser[0]?.email})`)

    // Test 3: Count search profiles
    const profileCount = await db.select({ count: count() }).from(searchProfiles)
    console.log(`✅ Search profiles: ${profileCount[0].count}`)

    // Test 4: Count jobs
    const jobCount = await db.select({ count: count() }).from(jobs)
    console.log(`✅ Jobs: ${jobCount[0].count}`)

    // Test 5: Count applications
    const appCount = await db.select({ count: count() }).from(jobApplications)
    console.log(`✅ Job applications: ${appCount[0].count}`)

    // Test 6: Query jobs with platform filter
    const indeedJobs = await db.select().from(jobs).where(eq(jobs.platform, 'indeed'))
    console.log(`✅ Indeed jobs: ${indeedJobs.length}`)

    // Test 7: Complex query with join
    const userId = testUser[0]?.id
    if (userId) {
      const userProfiles = await db
        .select({
          profileName: searchProfiles.name,
          isActive: searchProfiles.isActive,
        })
        .from(searchProfiles)
        .where(eq(searchProfiles.userId, userId))

      console.log(`✅ User profiles:`)
      userProfiles.forEach((p) => console.log(`   - ${p.profileName} (${p.isActive ? 'active' : 'inactive'})`))
    }

    console.log('\n🎉 All database tests passed!')
  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  }
}

testDatabase()
