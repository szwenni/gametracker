<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink :to="`/game/${gameId}`" class="t-text-muted hover:t-text">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </NuxtLink>
      <h1 class="text-lg font-bold t-text">Spieler einladen</h1>
    </div>

    <p class="text-sm t-text-muted mb-5">
      Teile den Einladungscode mit anderen Spielern. Sie können damit dem Spiel beitreten.
    </p>

    <!-- Generate new code -->
    <button class="btn-primary w-full mb-6 flex items-center justify-center gap-2" :disabled="generating" @click="generateCode">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      {{ generating ? 'Wird erstellt...' : 'Neuen Code erstellen' }}
    </button>

    <!-- Existing codes -->
    <div v-if="invitations.length > 0" class="space-y-3">
      <h2 class="text-xs font-bold t-text-muted uppercase tracking-wide">Aktive Codes</h2>
      <div v-for="inv in invitations" :key="inv.id" class="t-surface border t-border rounded-xl p-4 flex items-center gap-3">
        <div class="flex-1 min-w-0">
          <p class="text-lg font-mono font-bold t-text tracking-wider">{{ inv.code }}</p>
          <p class="text-[11px] t-text-muted mt-0.5">Spiel-ID: {{ gameId }}</p>
        </div>
        <button
          class="btn-secondary text-xs px-3 py-1.5"
          @click="copyCode(inv.code)"
        >
          {{ copiedId === inv.id ? 'Kopiert!' : 'Kopieren' }}
        </button>
      </div>
    </div>

    <!-- Join instructions -->
    <div class="mt-6 t-surface border t-border rounded-xl p-4">
      <h3 class="text-xs font-bold t-text-muted uppercase tracking-wide mb-2">So treten Spieler bei</h3>
      <ol class="text-xs t-text-muted space-y-1 list-decimal list-inside">
        <li>Öffne das Spiel über die Startseite</li>
        <li>Klicke auf "Spiel beitreten"</li>
        <li>Gib die Spiel-ID und den Code ein</li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const gameId = route.params.id as string
const { add: addToast } = useToast()

const generating = ref(false)
const copiedId = ref('')
const invitations = ref<Array<{ id: string; code: string; createdAt: string }>>([])

async function fetchInvitations() {
  try {
    const data = await $fetch<{ invitations: typeof invitations.value }>(`/api/v1/games/${gameId}/invitations`, {
      credentials: 'include'
    })
    invitations.value = data.invitations
  } catch {
    // silently fail
  }
}

async function generateCode() {
  generating.value = true
  try {
    await $fetch(`/api/v1/games/${gameId}/invitations`, {
      method: 'POST',
      credentials: 'include'
    })
    await fetchInvitations()
  } catch {
    addToast({ title: 'Fehler', message: 'Code konnte nicht erstellt werden', type: 'error' })
  } finally {
    generating.value = false
  }
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    copiedId.value = code
    setTimeout(() => { copiedId.value = '' }, 2000)
  } catch {
    addToast({ title: 'Fehler', message: 'Kopieren fehlgeschlagen', type: 'error' })
  }
}

await fetchInvitations()
</script>
