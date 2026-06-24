import type { TokenPayload, AuthTokens } from '../../shared/types/auth.js'

export interface AuthAdapter {
  generateTokens(userId: string, globalRole: string): Promise<AuthTokens>
  verifyAccessToken(token: string): TokenPayload | null
  refreshTokens(refreshToken: string): Promise<AuthTokens>
  revokeRefreshToken(refreshToken: string): Promise<void>
  revokeAllUserTokens(userId: string): Promise<void>
}
