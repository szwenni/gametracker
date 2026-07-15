<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold t-text">Meine Spiele</h1>
      <NuxtLink to="/game/new" class="btn-primary text-xs flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Neues Spiel
      </NuxtLink>
    </div>

    <!-- Active games -->
    <div v-if="activeGames.length > 0" class="mb-6">
      <h2 class="text-xs font-bold t-text-muted uppercase tracking-wide mb-3">Aktiv</h2>
      <div class="space-y-2">
        <NuxtLink
          v-for="game in activeGames"
          :key="game.id"
          :to="`/game/${game.id}`"
          class="t-surface rounded-xl border t-border p-4 flex items-center gap-3 hover:opacity-80 transition-opacity block"
        >
          <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background-color: var(--theme-primary-soft)">
            <svg v-if="game.type === 'phase10'" class="w-5 h-5 t-primary" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
            <svg v-else class="w-5 h-5 t-primary" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate t-text">{{ game.name }}</p>
            <p class="text-xs t-text-muted">{{ game.type === 'phase10' ? 'Phase 10' : 'Allgemein' }} · {{ game.playerCount }} Spieler</p>
          </div>
          <svg class="w-4 h-4 t-text-muted shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </NuxtLink>
      </div>
    </div>

    <!-- Ended games -->
    <div v-if="endedGames.length > 0">
      <h2 class="text-xs font-bold t-text-muted uppercase tracking-wide mb-3">Beendet</h2>
      <div class="space-y-2">
        <NuxtLink
          v-for="game in endedGames"
          :key="game.id"
          :to="`/game/${game.id}`"
          class="t-surface rounded-xl border t-border p-4 flex items-center gap-3 opacity-60 hover:opacity-80 transition-opacity block"
        >
          <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background-color: var(--theme-surface-elevated)">
            <svg class="w-5 h-5 t-text-muted" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate t-text">{{ game.name }}</p>
            <p class="text-xs t-text-muted">{{ game.type === 'phase10' ? 'Phase 10' : 'Allgemein' }} · {{ game.playerCount }} Spieler</p>
          </div>
          <svg class="w-4 h-4 t-text-muted shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </NuxtLink>
      </div>
    </div>

    <!-- Join game section -->
    <div class="mb-6">
      <button
        v-if="!showJoin"
        class="btn-secondary w-full text-xs flex items-center justify-center gap-1.5"
        @click="showJoin = true"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
        Spiel beitreten
      </button>
      <form v-else class="t-surface border t-border rounded-xl p-4 space-y-3" @submit.prevent="handleJoin">
        <div>
          <label class="block text-xs font-medium t-text-muted mb-1">Einladungscode</label>
          <input v-model="joinCode" type="text" class="field-input uppercase tracking-widest text-center font-mono" placeholder="z.B. A1B2C3D4">
        </div>
        <p v-if="joinError" class="text-xs text-red-400">{{ joinError }}</p>
        <div class="flex gap-2">
          <button type="button" class="btn-secondary flex-1 text-xs" @click="showJoin = false">Abbrechen</button>
          <button type="submit" class="btn-primary flex-1 text-xs" :disabled="joining">Beitreten</button>
        </div>
      </form>
    </div>

    <!-- Empty state -->
    <div v-if="!pending && games.length === 0" class="text-center py-16">
      <svg class="w-12 h-12 mx-auto mb-4 t-text-muted" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
      </svg>
      <p class="text-sm t-text-muted">Noch keine Spiele vorhanden</p>
      <p class="text-xs t-text-muted mt-1">Erstelle ein neues Spiel oder trete einem bei</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { add: addToast } = useToast()

const { data: gamesData, pending, refresh: refreshGames } = await useFetch('/api/v1/games', {
  credentials: 'include'
})

const games = computed(() => (gamesData.value as any)?.games ?? [])
const activeGames = computed(() => games.value.filter((g: any) => g.status === 'active'))
const endedGames = computed(() => games.value.filter((g: any) => g.status === 'ended'))

const showJoin = ref(false)
const joinCode = ref('')
const joinError = ref('')
const joining = ref(false)

async function handleJoin() {
  joinError.value = ''
  joining.value = true
  try {
    const result = await $fetch<{ success: boolean; gameId: string }>('/api/v1/games/join', {
      method: 'POST',
      body: { code: joinCode.value },
      credentials: 'include'
    })
    showJoin.value = false
    joinCode.value = ''
    navigateTo(`/game/${result.gameId}`)
  } catch (e: any) {
    joinError.value = e?.data?.error ?? 'Beitreten fehlgeschlagen'
  } finally {
    joining.value = false
  }
}
</script>
