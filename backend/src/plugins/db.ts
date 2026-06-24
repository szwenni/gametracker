import fp from 'fastify-plugin'
import pg from 'pg'
import { readdir, readFile, access } from 'node:fs/promises'
import { join, resolve, basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { FastifyInstance } from 'fastify'

const { Pool } = pg

declare module 'fastify' {
  interface FastifyInstance {
    db: pg.Pool
  }
}

async function fileExists(path: string): Promise<boolean> {
  try { await access(path); return true } catch { return false }
}

async function runMigrations(pool: pg.Pool, logger: FastifyInstance['log']) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const migrationsDir = resolve(
    process.env.MIGRATIONS_DIR ?? join(import.meta.dirname ?? __dirname, '../../../database/migrations')
  )

  let files: string[]
  try {
    files = await readdir(migrationsDir)
  } catch {
    logger.info('No migrations directory found, skipping migrations')
    return
  }

  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort()
  if (sqlFiles.length === 0) return

  const applied = await pool.query('SELECT version FROM schema_migrations')
  const appliedSet = new Set(applied.rows.map((r: { version: string }) => r.version))

  for (const file of sqlFiles) {
    if (appliedSet.has(file)) continue

    const sql = await readFile(join(migrationsDir, file), 'utf-8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file])
      await client.query('COMMIT')
      logger.info(`Migration applied: ${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      logger.error(`Migration failed: ${file}`)
      throw err
    } finally {
      client.release()
    }

    const jsFile = basename(file, '.sql') + '.js'
    const jsPath = join(migrationsDir, jsFile)
    if (await fileExists(jsPath)) {
      try {
        const mod = await import(pathToFileURL(jsPath).href)
        const migrateFn = mod.default ?? mod
        await migrateFn(pool)
        logger.info(`JS migration applied: ${jsFile}`)
      } catch (err) {
        logger.error(`JS migration failed: ${jsFile}`)
        throw err
      }
    }
  }
}

async function dbPlugin(app: FastifyInstance) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://app:app_dev@localhost:5433/app'
  })

  await pool.query('SELECT 1')
  app.log.info('Database connected')

  await runMigrations(pool, app.log)

  app.decorate('db', pool)

  app.addHook('onClose', async () => {
    await pool.end()
  })
}

export default fp(dbPlugin, { name: 'db' })
