import bcrypt from 'bcrypt'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireAuth } from '../middleware/guards.js'

const SALT_ROUNDS = 12
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60
}

export async function authRoutes(app: FastifyInstance) {

  app.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const { inviteToken, username, password, displayName } = request.body as {
      inviteToken: string
      username: string
      password: string
      displayName: string
    }

    if (!inviteToken || !username || !password || !displayName) {
      return reply.code(400).send({ error: 'inviteToken, username, password und displayName sind erforderlich', statusCode: 400 })
    }

    const invite = await app.db.query(
      'SELECT id, used_by FROM app_invitations WHERE token = $1',
      [inviteToken]
    )
    if (invite.rowCount === 0) {
      return reply.code(400).send({ error: 'Ungültiger Einladungslink', statusCode: 400 })
    }
    if (invite.rows[0].used_by) {
      return reply.code(400).send({ error: 'Einladungslink wurde bereits verwendet', statusCode: 400 })
    }

    const existing = await app.db.query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()])
    if (existing.rowCount && existing.rowCount > 0) {
      return reply.code(409).send({ error: 'Benutzername bereits vergeben', statusCode: 409 })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const result = await app.db.query(
      `INSERT INTO users (username, display_name, password_hash) VALUES ($1, $2, $3) RETURNING id, global_role`,
      [username.toLowerCase(), displayName, passwordHash]
    )

    const user = result.rows[0]

    await app.db.query(
      'UPDATE app_invitations SET used_by = $1, used_at = NOW() WHERE id = $2',
      [user.id, invite.rows[0].id]
    )

    const tokens = await app.auth.generateTokens(user.id, user.global_role)

    reply.setCookie('access_token', tokens.accessToken, REFRESH_COOKIE_OPTIONS)
    reply.setCookie('refresh_token', tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    return {
      user: {
        id: user.id,
        username: username.toLowerCase(),
        displayName,
        avatarPath: null,
        globalRole: user.global_role
      }
    }
  })

  app.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { username, password } = request.body as { username: string; password: string }

    if (!username || !password) {
      return reply.code(400).send({ error: 'Benutzername und Passwort sind erforderlich', statusCode: 400 })
    }

    const result = await app.db.query(
      'SELECT id, username, display_name, avatar_path, password_hash, global_role FROM users WHERE username = $1',
      [username.toLowerCase()]
    )

    if (result.rowCount === 0) {
      return reply.code(401).send({ error: 'Ungültige Anmeldedaten', statusCode: 401 })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return reply.code(401).send({ error: 'Ungültige Anmeldedaten', statusCode: 401 })
    }

    const tokens = await app.auth.generateTokens(user.id, user.global_role)

    reply.setCookie('access_token', tokens.accessToken, REFRESH_COOKIE_OPTIONS)
    reply.setCookie('refresh_token', tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarPath: user.avatar_path,
        globalRole: user.global_role
      }
    }
  })

  app.post('/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refresh_token
    if (!refreshToken) {
      return reply.code(401).send({ error: 'No refresh token', statusCode: 401 })
    }

    try {
      const tokens = await app.auth.refreshTokens(refreshToken)
      reply.setCookie('access_token', tokens.accessToken, REFRESH_COOKIE_OPTIONS)
      reply.setCookie('refresh_token', tokens.refreshToken, REFRESH_COOKIE_OPTIONS)
      return { success: true }
    } catch {
      reply.clearCookie('access_token')
      reply.clearCookie('refresh_token')
      return reply.code(401).send({ error: 'Invalid refresh token', statusCode: 401 })
    }
  })

  app.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refresh_token
    if (refreshToken) {
      await app.auth.revokeRefreshToken(refreshToken)
    }

    reply.clearCookie('access_token')
    reply.clearCookie('refresh_token')

    return { success: true }
  })

  app.get('/auth/me', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest) => {
    const userId = request.authUser!.userId

    const result = await app.db.query(
      'SELECT id, username, display_name, avatar_path, global_role, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    )

    if (result.rowCount === 0) {
      throw { statusCode: 404, message: 'User not found' }
    }

    const u = result.rows[0]
    return {
      user: {
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarPath: u.avatar_path,
        globalRole: u.global_role,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }
    }
  })
}
