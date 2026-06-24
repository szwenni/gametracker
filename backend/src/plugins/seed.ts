import fp from 'fastify-plugin'
import bcrypt from 'bcrypt'
import type { FastifyInstance } from 'fastify'

const SALT_ROUNDS = 12

async function seedPlugin(app: FastifyInstance) {
  const result = await app.db.query("SELECT id FROM users WHERE global_role = 'admin' LIMIT 1")

  if (result.rowCount === 0) {
    const adminUsername = process.env.ADMIN_USERNAME ?? 'admin'
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      app.log.warn('No admin user found and ADMIN_PASSWORD not set. Skipping admin seed.')
      return
    }

    const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS)

    await app.db.query(
      `INSERT INTO users (username, display_name, password_hash, global_role) VALUES ($1, $2, $3, 'admin')`,
      [adminUsername.toLowerCase(), adminUsername, passwordHash]
    )

    app.log.info(`Admin user '${adminUsername}' created from environment variables`)
  }
}

export default fp(seedPlugin, {
  name: 'seed',
  dependencies: ['db']
})
