import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db, sqlite } from '../src/lib/db'
import path from 'path'

async function runMigrations() {
  console.log('Running database migrations...')

  try {
    // Run migrations from the migrations folder
    migrate(db, {
      migrationsFolder: path.join(process.cwd(), 'src/lib/db/migrations'),
    })

    console.log('✅ Migrations completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    sqlite.close()
  }
}

runMigrations()
