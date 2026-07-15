export type GameType = 'generic' | 'phase10'
export type GameStatus = 'active' | 'ended'

export interface Game {
  id: string
  name: string
  type: GameType
  createdBy: string
  status: GameStatus
  createdAt: string
  endedAt: string | null
}

export interface GamePlayer {
  id: string
  userId: string | null
  displayName: string
  avatarPath: string | null
  joined: boolean
}

export interface GameRound {
  id: string
  roundNumber: number
  createdAt: string
}

export interface GameScore {
  id: string
  roundId: string
  playerId: string
  score: number
}

export interface Phase10Phase {
  playerId: string
  phaseNumber: number
  completed: boolean
  completedInRoundId: string | null
}

export interface GameState {
  game: Game
  players: GamePlayer[]
  rounds: GameRound[]
  scores: GameScore[]
  phases: Phase10Phase[]
}

export interface GameInvitation {
  id: string
  gameId: string
  code: string
  label: string | null
  createdBy: string
  createdAt: string
}

export interface AppInvitation {
  id: string
  token: string
  createdBy: string
  usedBy: string | null
  usedByName: string | null
  usedAt: string | null
  createdAt: string
}
