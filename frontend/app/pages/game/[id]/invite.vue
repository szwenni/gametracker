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
      Teile die Einladungscodes mit den Mitspielern. Sie können damit dem Spiel beitreten.
    </p>

    <!-- Existing codes -->
    <div v-if="invitations.length > 0" class="space-y-3 mb-6">
      <h2 class="text-xs font-bold t-text-muted uppercase tracking-wide">Einladungscodes</h2>
      <div v-for="inv in invitations" :key="inv.id" class="t-surface border t-border rounded-xl p-4">
        <div class="flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <p v-if="inv.label" class="text-xs font-medium t-text-muted mb-0.5">{{ inv.label }}</p>
            <p class="text-lg font-mono font-bold t-text tracking-wider">{{ inv.code }}</p>
          </div>
          <button
            class="btn-secondary text-xs px-3 py-1.5 shrink-0"
            @click="copyInvite(inv)"
          >
            {{ copiedId === inv.id ? 'Kopiert!' : 'Kopieren' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="text-center py-8 mb-6">
      <p class="text-sm t-text-muted">Noch keine Einladungscodes vorhanden</p>
    </div>

    <!-- Generate new code -->
    <div class="t-surface border t-border rounded-xl p-4 mb-6">
      <h3 class="text-xs font-bold t-text-muted uppercase tracking-wide mb-3">Neuen Code erstellen</h3>
      <div class="flex items-center gap-2">
        <input
          v-model="newLabel"
          type="text"
          class="field-input flex-1"
          placeholder="Spielername"
          required
        >
        <button class="btn-primary text-xs px-4 py-2.5 shrink-0" :disabled="generating || !newLabel.trim()" @click="generateCode">
          {{ generating ? '...' : 'Erstellen' }}
        </button>
      </div>
    </div>

    <!-- Joined players -->
    <div v-if="joinedPlayers.length > 0" class="mb-6">
      <h2 class="text-xs font-bold t-text-muted uppercase tracking-wide mb-2">Beigetreten</h2>
      <div class="flex items-center gap-2 flex-wrap">
        <div
          v-for="player in joinedPlayers"
          :key="player.id"
          class="flex items-center gap-1.5 bg-white/5 rounded-full pl-1 pr-2.5 py-1"
        >
          <img
            v-if="player.avatarPath"
            :src="player.avatarPath"
            :alt="player.displayName"
            class="w-5 h-5 rounded-full object-cover"
          >
          <div v-else class="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold t-text">
            {{ player.displayName.charAt(0).toUpperCase() }}
          </div>
          <span class="text-xs t-text">{{ player.displayName }}</span>
        </div>
      </div>
    </div>

    <!-- Join instructions -->
    <div class="t-surface border t-border rounded-xl p-4">
      <h3 class="text-xs font-bold t-text-muted uppercase tracking-wide mb-2">So treten Spieler bei</h3>
      <ol class="text-xs t-text-muted space-y-1 list-decimal list-inside">
        <li>Öffne die Startseite des Spieletrackers</li>
        <li>Klicke auf "Spiel beitreten"</li>
        <li>Gib den Einladungscode ein</li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GamePlayer } from '@shared/types/game'

definePageMeta({ middleware: ['auth'] })

interface Invitation {
  id: string
  code: string
  label: string | null
  created_at: string
}

const route = useRoute()
const gameId = route.params.id as string
const { add: addToast } = useToast()

const generating = ref(false)
const loading = ref(true)
const copiedId = ref('')
const newLabel = ref('')
const invitations = ref<Invitation[]>([])
const players = ref<GamePlayer[]>([])

const joinedPlayers = computed(() => players.value.filter((p: GamePlayer) => p.joined))

async function fetchInvitations() {
  loading.value = true
  try {
    const data = await $fetch<{ invitations: Invitation[] }>(`/api/v1/games/${gameId}/invitations`, {
      credentials: 'include'
    })
    invitations.value = data.invitations
  } catch {
    // silently fail
  } finally {
    loading.value = false
  }
}

async function fetchPlayers() {
  try {
    const data = await $fetch<{ game: unknown; players: GamePlayer[] }>(`/api/v1/games/${gameId}`, {
      credentials: 'include'
    })
    players.value = data.players
  } catch {
    // silently fail
  }
}

async function generateCode() {
  generating.value = true
  try {
    await $fetch(`/api/v1/games/${gameId}/invitations`, {
      method: 'POST',
      body: { label: newLabel.value.trim() },
      credentials: 'include'
    })
    newLabel.value = ''
    await fetchInvitations()
  } catch {
    addToast({ title: 'Fehler', message: 'Code konnte nicht erstellt werden', type: 'error' })
  } finally {
    generating.value = false
  }
}

async function copyInvite(inv: Invitation) {
  try {
    await navigator.clipboard.writeText(inv.code)
    copiedId.value = inv.id
    setTimeout(() => { copiedId.value = '' }, 2000)
  } catch {
    addToast({ title: 'Fehler', message: 'Kopieren fehlgeschlagen', type: 'error' })
  }
}

await Promise.all([fetchInvitations(), fetchPlayers()])
</script>
