<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <h1 class="text-xl font-bold t-text mb-6">Neues Spiel erstellen</h1>

    <form class="space-y-5" @submit.prevent="handleCreate">
      <div>
        <label class="block text-xs font-medium t-text-muted mb-1">Spielname</label>
        <input v-model="name" type="text" class="field-input" placeholder="z.B. Freitagsrunde" required>
      </div>

      <div>
        <label class="block text-xs font-medium t-text-muted mb-2">Spieltyp</label>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="t-surface rounded-xl border p-4 text-left transition-all"
            :class="type === 'generic' ? 'border-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)]' : 't-border'"
            @click="type = 'generic'"
          >
            <svg class="w-6 h-6 mb-2" :class="type === 'generic' ? 't-primary' : 't-text-muted'" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
            <p class="text-sm font-medium t-text">Allgemein</p>
            <p class="text-[11px] t-text-muted mt-0.5">Punkte pro Runde aufschreiben</p>
          </button>

          <button
            type="button"
            class="t-surface rounded-xl border p-4 text-left transition-all"
            :class="type === 'phase10' ? 'border-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)]' : 't-border'"
            @click="type = 'phase10'"
          >
            <svg class="w-6 h-6 mb-2" :class="type === 'phase10' ? 't-primary' : 't-text-muted'" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
            <p class="text-sm font-medium t-text">Phase 10</p>
            <p class="text-[11px] t-text-muted mt-0.5">Phasen abhaken + Punkte</p>
          </button>
        </div>
      </div>

      <!-- Player names -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-xs font-medium t-text-muted">Spieler</label>
          <button
            type="button"
            class="text-xs t-primary font-medium"
            @click="playerNames.push('')"
          >+ Spieler hinzufügen</button>
        </div>
        <p class="text-[11px] t-text-muted mb-3">Für jeden Mitspieler wird ein Einladungscode erstellt</p>
        <div class="space-y-2">
          <!-- Current user (always first, not removable) -->
          <div class="flex items-center gap-2 opacity-70">
            <div class="field-input flex-1 flex items-center gap-2">
              <div class="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold t-text shrink-0">
                {{ user?.displayName?.charAt(0)?.toUpperCase() ?? '?' }}
              </div>
              <span class="text-sm t-text">{{ user?.displayName ?? 'Du' }}</span>
            </div>
            <span class="text-[10px] t-text-muted px-1.5">Du</span>
          </div>
          <!-- Other players -->
          <div v-for="(_, idx) in playerNames" :key="idx" class="flex items-center gap-2">
            <input
              v-model="playerNames[idx]"
              type="text"
              class="field-input flex-1"
              :placeholder="`Spieler ${idx + 2}`"
            >
            <button
              type="button"
              class="text-red-400 hover:text-red-300 p-1.5"
              @click="playerNames.splice(idx, 1)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <p v-if="error" class="text-xs text-red-400">{{ error }}</p>

      <button type="submit" class="btn-primary w-full" :disabled="creating">
        {{ creating ? 'Wird erstellt...' : 'Spiel erstellen' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { user } = useAuth()
const name = ref('')
const type = ref<'generic' | 'phase10'>('generic')
const playerNames = ref<string[]>(['', ''])
const error = ref('')
const creating = ref(false)

async function handleCreate() {
  error.value = ''
  const names = playerNames.value.map(n => n.trim()).filter(n => n.length > 0)
  if (names.length === 0) {
    error.value = 'Mindestens ein Mitspieler ist erforderlich'
    return
  }
  creating.value = true
  try {
    const data = await $fetch<{ game: { id: string } }>('/api/v1/games', {
      method: 'POST',
      body: { name: name.value, type: type.value, playerNames: names },
      credentials: 'include'
    })
    navigateTo(`/game/${data.game.id}/invite`)
  } catch (e: any) {
    error.value = e?.data?.error ?? 'Erstellen fehlgeschlagen'
  } finally {
    creating.value = false
  }
}
</script>
