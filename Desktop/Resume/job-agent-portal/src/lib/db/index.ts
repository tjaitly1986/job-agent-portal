import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'
import fs from 'fs'

const DATABASE_URL = process.env.DATABASE_URL || 'file:./data/portal.sqlite'

// Extract file path from DATABASE_URL
function getDatabasePath(): string {
  const url = DATABASE_URL.replace('file:', '')
  return path.resolve(process.cwd(), url)
}

// Ensure data directory exists
function ensureDataDirectory() {
  const dbPath = getDatabasePath()
  const dir = path.dirname(dbPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Create singleton SQLite connection
let sqliteInstance: Database.Database | null = null

function getSqliteConnection(): Database.Database {
  if (!sqliteInstance) {
    ensureDataDirectory()
    const dbPath = getDatabasePath()

    sqliteInstance = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.error : undefined,
    })

    // Enable WAL mode for better concurrency
    sqliteInstance.pragma('journal_mode = WAL')

    // Enable foreign key constraints
    sqliteInstance.pragma('foreign_keys = ON')
  }

  return sqliteInstance
}

// Create Drizzle instance with schema
export const db = drizzle(getSqliteConnection(), { schema })

// Export raw SQLite connection for advanced use cases
export const sqlite = getSqliteConnection()

// Close database connection (for graceful shutdown)
export function closeDatabase() {
  if (sqliteInstance) {
    sqliteInstance.close()
    sqliteInstance = null
  }
}

// Handle process shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    closeDatabase()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    closeDatabase()
    process.exit(0)
  })
}
