import type { GameState } from '@shared/types/game'

export function useGame(gameId: string) {
  const state = useState<GameState | null>(`game-${gameId}`, () => null)
  const loading = useState<boolean>(`game-loading-${gameId}`, () => true)

  async function fetchGame() {
    loading.value = true
    try {
      const data = await $fetch<GameState>(`/api/v1/games/${gameId}`, {
        credentials: 'include'
      })
      state.value = data
    } catch {
      state.value = null
    } finally {
      loading.value = false
    }
  }

  async function addRound() {
    await $fetch(`/api/v1/games/${gameId}/rounds`, {
      method: 'POST',
      credentials: 'include'
    })
  }

  async function saveScores(roundId: string, scores: Array<{ userId: string; score: number }>) {
    await $fetch(`/api/v1/games/${gameId}/rounds/${roundId}/scores`, {
      method: 'PUT',
      body: { scores },
      credentials: 'include'
    })
  }

  async function updatePhase(userId: string, phaseNumber: number, completed: boolean, roundId?: string) {
    await $fetch(`/api/v1/games/${gameId}/phases`, {
      method: 'PUT',
      body: { userId, phaseNumber, completed, roundId },
      credentials: 'include'
    })
  }

  async function endGame() {
    await $fetch(`/api/v1/games/${gameId}`, {
      method: 'PATCH',
      body: { status: 'ended' },
      credentials: 'include'
    })
  }

  return {
    state: readonly(state),
    loading: readonly(loading),
    fetchGame,
    addRound,
    saveScores,
    updatePhase,
    endGame,
    _updateState: (newState: GameState) => { state.value = newState }
  }
}
