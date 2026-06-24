<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <h1 class="text-xl font-bold t-text mb-6">Einstellungen</h1>

    <!-- App invitations -->
    <section>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xs font-bold t-text-muted uppercase tracking-wide">Einladungslinks</h2>
        <button class="btn-primary text-xs px-3 py-1.5" :disabled="generating" @click="generateInvite">
          {{ generating ? '...' : 'Neuer Link' }}
        </button>
      </div>

      <div v-if="invitations.length === 0 && !loadingInvites" class="t-surface border t-border rounded-xl p-6 text-center">
        <p class="text-sm t-text-muted">Noch keine Einladungen erstellt</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="inv in invitations"
          :key="inv.id"
          class="t-surface border t-border rounded-xl p-4"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div v-if="!inv.usedAt" class="flex items-center gap-2">
                <span class="inline-block w-2 h-2 rounded-full bg-green-400 shrink-0"></span>
                <p class="text-xs t-text-muted">Verfügbar</p>
              </div>
              <div v-else class="flex items-center gap-2">
                <span class="inline-block w-2 h-2 rounded-full bg-gray-400 shrink-0"></span>
                <p class="text-xs t-text-muted">
                  Verwendet von <span class="font-medium t-text">{{ inv.usedByName }}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                v-if="!inv.usedAt"
                class="btn-secondary text-xs px-2.5 py-1"
                @click="copyLink(inv)"
              >
                {{ copiedId === inv.id ? '✓' : 'Link kopieren' }}
              </button>
              <button
                v-if="!inv.usedAt"
                class="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                @click="deleteInvite(inv.id)"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { user } = useAuth()
const { add: addToast } = useToast()
const config = useRuntimeConfig()

if (user.value?.globalRole !== 'admin') {
  navigateTo('/')
}

interface Invitation {
  id: string
  token: string
  createdByName: string
  usedByName: string | null
  usedAt: string | null
  createdAt: string
}

const invitations = ref<Invitation[]>([])
const loadingInvites = ref(true)
const generating = ref(false)
const copiedId = ref('')

async function fetchInvitations() {
  loadingInvites.value = true
  try {
    const data = await $fetch<{ invitations: Invitation[] }>('/api/v1/admin/invitations', {
      credentials: 'include'
    })
    invitations.value = data.invitations
  } catch {
    // silently fail
  } finally {
    loadingInvites.value = false
  }
}

async function generateInvite() {
  generating.value = true
  try {
    await $fetch('/api/v1/admin/invitations', {
      method: 'POST',
      credentials: 'include'
    })
    await fetchInvitations()
    addToast({ title: 'Erstellt', message: 'Einladungslink wurde erstellt', type: 'success' })
  } catch {
    addToast({ title: 'Fehler', message: 'Konnte nicht erstellt werden', type: 'error' })
  } finally {
    generating.value = false
  }
}

async function copyLink(inv: Invitation) {
  const domain = config.public.appDomain || window.location.host
  const proto = window.location.protocol
  const link = `${proto}//${domain}/join/${inv.token}`
  try {
    await navigator.clipboard.writeText(link)
    copiedId.value = inv.id
    setTimeout(() => { copiedId.value = '' }, 2000)
  } catch {
    addToast({ title: 'Fehler', message: 'Kopieren fehlgeschlagen', type: 'error' })
  }
}

async function deleteInvite(id: string) {
  try {
    await $fetch(`/api/v1/admin/invitations/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    await fetchInvitations()
  } catch {
    addToast({ title: 'Fehler', message: 'Löschen fehlgeschlagen', type: 'error' })
  }
}

await fetchInvitations()
</script>
