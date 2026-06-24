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

  // POST /auth/register
  app.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, displayName } = request.body as {
      email: string
      password: string
      displayName: string
    }

    if (!email || !password || !displayName) {
      return reply.code(400).send({ error: 'email, password, and displayName are required', statusCode: 400 })
    }

    const existing = await app.db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (existing.rowCount && existing.rowCount > 0) {
      return reply.code(409).send({ error: 'Email already registered', statusCode: 409 })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const result = await app.db.query(
      `INSERT INTO users (email, display_name, password_hash) VALUES ($1, $2, $3) RETURNING id, global_role`,
      [email.toLowerCase(), displayName, passwordHash]
    )

    const user = result.rows[0]
    const tokens = await app.auth.generateTokens(user.id, user.global_role)

    reply.setCookie('access_token', tokens.accessToken, REFRESH_COOKIE_OPTIONS)
    reply.setCookie('refresh_token', tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    return {
      user: {
        id: user.id,
        email: email.toLowerCase(),
        displayName,
        globalRole: user.global_role
      }
    }
  })

  // POST /auth/login
  app.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string }

    if (!email || !password) {
      return reply.code(400).send({ error: 'email and password are required', statusCode: 400 })
    }

    const result = await app.db.query(
      'SELECT id, email, display_name, password_hash, global_role FROM users WHERE email = $1',
      [email.toLowerCase()]
    )

    if (result.rowCount === 0) {
      return reply.code(401).send({ error: 'Invalid credentials', statusCode: 401 })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials', statusCode: 401 })
    }

    const tokens = await app.auth.generateTokens(user.id, user.global_role)

    reply.setCookie('access_token', tokens.accessToken, REFRESH_COOKIE_OPTIONS)
    reply.setCookie('refresh_token', tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        globalRole: user.global_role
      }
    }
  })

  // POST /auth/refresh
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

  // POST /auth/logout
  app.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refresh_token
    if (refreshToken) {
      await app.auth.revokeRefreshToken(refreshToken)
    }

    reply.clearCookie('access_token')
    reply.clearCookie('refresh_token')

    return { success: true }
  })

  // GET /auth/me
  app.get('/auth/me', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest) => {
    const userId = request.authUser!.userId

    const result = await app.db.query(
      'SELECT id, email, display_name, global_role, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    )

    if (result.rowCount === 0) {
      throw { statusCode: 404, message: 'User not found' }
    }

    const u = result.rows[0]
    return {
      user: {
        id: u.id,
        email: u.email,
        displayName: u.display_name,
        globalRole: u.global_role,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }
    }
  })
}
