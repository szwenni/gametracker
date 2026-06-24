export * from './user'
export * from './auth'
export * from './game'
export * from './notification'

export interface ApiError {
  error: string
  statusCode: number
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  cursor?: string
}

export interface WebSocketMessage {
  channel: string
  event: string
  data: unknown
}
