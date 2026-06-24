<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <div v-if="loading" class="text-center py-16">
      <p class="text-sm t-text-muted">Laden...</p>
    </div>

    <template v-else-if="state">
      <!-- Header -->
      <div class="flex items-center justify-between mb-5">
        <div class="min-w-0">
          <h1 class="text-lg font-bold t-text truncate">{{ state.game.name }}</h1>
          <p class="text-xs t-text-muted">
            {{ state.game.type === 'phase10' ? 'Phase 10' : 'Allgemein' }} · {{ state.players.length }} Spieler
            <span v-if="state.game.status === 'ended'" class="text-yellow-400 font-medium"> · Beendet</span>
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <NuxtLink v-if="isCreator" :to="`/game/${gameId}/invite`" class="btn-secondary text-xs px-3 py-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
          </NuxtLink>
          <button v-if="isCreator && state.game.status === 'active'" class="btn-danger text-xs px-3 py-2" @click="handleEndGame">
            Beenden
          </button>
        </div>
      </div>

      <!-- Phase 10 grid -->
      <div v-if="state.game.type === 'phase10'" class="mb-5">
        <h2 class="text-xs font-bold t-text-muted uppercase tracking-wide mb-2">Phasen</h2>
        <Phase10Grid
          :players="state.players"
          :phases="state.phases"
          :is-creator="isCreator"
          :current-user-id="user!.id"
          @phase-toggle="handlePhaseToggle"
        />
      </div>

      <!-- Score table -->
      <div class="mb-5">
        <h2 class="text-xs font-bold t-text-muted uppercase tracking-wide mb-2">Punkte</h2>
        <GameTable
          :players="state.players"
          :rounds="state.rounds"
          :scores="state.scores"
          :is-creator="isCreator"
          :current-user-id="user!.id"
          @score-change="handleScoreChange"
        />
      </div>

      <!-- Add round button -->
      <button
        v-if="isCreator && state.game.status === 'active'"
        class="btn-primary w-full flex items-center justify-center gap-2"
        @click="handleAddRound"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Neue Runde
      </button>

      <!-- Phase 10 summary -->
      <div v-if="state.game.type === 'phase10' && state.rounds.length > 0" class="mt-5">
        <h2 class="text-xs font-bold t-text-muted uppercase tracking-wide mb-2">Rangliste</h2>
        <div class="t-surface border t-border rounded-xl divide-y" style="border-color: var(--theme-border)">
          <div
            v-for="(entry, idx) in ranking"
            :key="entry.userId"
            class="flex items-center gap-3 px-4 py-3"
          >
            <span class="text-sm font-bold t-text-muted w-5">{{ idx + 1 }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium t-text truncate">{{ entry.displayName }}</p>
              <p class="text-[11px] t-text-muted">{{ entry.completedPhases }}/10 Phasen</p>
            </div>
            <span class="text-sm font-bold tabular-nums t-text">{{ entry.totalScore }} Pkt.</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const gameId = route.params.id as string
const { user } = useAuth()
const { state, loading, fetchGame, addRound, saveScores, updatePhase, endGame, _updateState } = useGame(gameId)
const { subscribe, unsubscribe, on, off } = useWebSocket()
const { add: addToast } = useToast()

const isCreator = computed(() => state.value?.game.createdBy === user.value?.id)

const ranking = computed(() => {
  if (!state.value || state.value.game.type !== 'phase10') return []

  return state.value.players.map(player => {
    const completedPhases = state.value!.phases.filter(p => p.userId === player.userId && p.completed).length
    const totalScore = state.value!.scores.filter(s => s.userId === player.userId).reduce((sum, s) => sum + s.score, 0)
    return { ...player, completedPhases, totalScore }
  }).sort((a, b) => {
    if (b.completedPhases !== a.completedPhases) return b.completedPhases - a.completedPhases
    return a.totalScore - b.totalScore
  })
})

await fetchGame()

function handleWsUpdate(msg: any) {
  if (msg.data && msg.channel === `game:${gameId}`) {
    if (msg.event === 'game:updated' && msg.data.game) {
      _updateState(msg.data)
    } else if (msg.event === 'game:round_added' || msg.event === 'game:player_joined' || msg.event === 'game:ended') {
      fetchGame()
    }
  }
}

onMounted(() => {
  subscribe(`game:${gameId}`)
  on('game:updated', handleWsUpdate)
  on('game:round_added', handleWsUpdate)
  on('game:player_joined', handleWsUpdate)
  on('game:ended', handleWsUpdate)
})

onUnmounted(() => {
  unsubscribe(`game:${gameId}`)
  off('game:updated', handleWsUpdate)
  off('game:round_added', handleWsUpdate)
  off('game:player_joined', handleWsUpdate)
  off('game:ended', handleWsUpdate)
})

async function handleAddRound() {
  try {
    await addRound()
    await fetchGame()
  } catch {
    addToast({ title: 'Fehler', message: 'Runde konnte nicht hinzugefügt werden', type: 'error' })
  }
}

async function handleScoreChange(roundId: string, userId: string, score: number) {
  try {
    await saveScores(roundId, [{ userId, score }])
  } catch {
    addToast({ title: 'Fehler', message: 'Score konnte nicht gespeichert werden', type: 'error' })
  }
}

async function handlePhaseToggle(userId: string, phaseNumber: number, completed: boolean) {
  try {
    await updatePhase(userId, phaseNumber, completed)
  } catch {
    addToast({ title: 'Fehler', message: 'Phase konnte nicht aktualisiert werden', type: 'error' })
  }
}

async function handleEndGame() {
  if (!confirm('Spiel wirklich beenden?')) return
  try {
    await endGame()
    await fetchGame()
  } catch {
    addToast({ title: 'Fehler', message: 'Spiel konnte nicht beendet werden', type: 'error' })
  }
}
</script>
