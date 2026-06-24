import crypto from 'node:crypto'
import type pg from 'pg'
import type { FastifyInstance } from 'fastify'
import type { TokenPayload, AuthTokens } from '../../shared/types/auth.js'
import type { AuthAdapter } from './auth.js'

const ACCESS_TOKEN_EXPIRY = '8h'
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60

export class JwtAuthAdapter implements AuthAdapter {
  constructor(
    private app: FastifyInstance,
    private db: pg.Pool
  ) {}

  async generateTokens(userId: string, globalRole: string): Promise<AuthTokens> {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = { userId, globalRole }

    const accessToken = this.app.jwt.sign(payload, { expiresIn: ACCESS_TOKEN_EXPIRY })

    const refreshToken = crypto.randomBytes(48).toString('base64url')
    const tokenHash = this.hashToken(refreshToken)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000)

    await this.db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    )

    return { accessToken, refreshToken }
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      return this.app.jwt.verify<TokenPayload>(token)
    } catch {
      return null
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken)

    const result = await this.db.query(
      `DELETE FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW() RETURNING user_id`,
      [tokenHash]
    )

    if (result.rowCount === 0) {
      throw new Error('Invalid or expired refresh token')
    }

    const userId = result.rows[0].user_id as string

    const userResult = await this.db.query(
      `SELECT global_role FROM users WHERE id = $1`,
      [userId]
    )

    if (userResult.rowCount === 0) {
      throw new Error('User not found')
    }

    const globalRole = userResult.rows[0].global_role as string
    return await this.generateTokens(userId, globalRole)
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken)
    await this.db.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [tokenHash])
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId])
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }
}
