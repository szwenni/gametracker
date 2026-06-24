export interface TokenPayload {
  userId: string
  globalRole: string
  iat?: number
  exp?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  user: {
    id: string
    username: string
    displayName: string
    avatarPath: string | null
    globalRole: string
  }
}

export interface LoginResponse {
  user: {
    id: string
    username: string
    displayName: string
    avatarPath: string | null
    globalRole: string
  }
}
