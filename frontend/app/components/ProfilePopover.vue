<template>
  <div class="fixed inset-0 z-50" @click.self="$emit('close')">
    <div class="absolute top-14 left-4 right-4 max-w-sm t-surface rounded-2xl border t-border p-5 shadow-2xl" style="margin-top: env(safe-area-inset-top)">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-14 h-14 rounded-full overflow-hidden shrink-0 flex items-center justify-center" style="background-color: var(--theme-primary-soft)">
          <img v-if="user?.avatarPath" :src="user.avatarPath" class="w-full h-full object-cover" alt="">
          <svg v-else class="w-7 h-7" style="color: var(--theme-primary)" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
          </svg>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium truncate t-text">{{ user?.displayName }}</p>
          <p class="text-xs t-text-muted">@{{ user?.username }}</p>
        </div>
      </div>

      <!-- Display name edit -->
      <div class="mb-3">
        <label class="block text-xs font-medium t-text-muted mb-1">Anzeigename</label>
        <div class="flex gap-2">
          <input
            v-model="editName"
            class="field-input flex-1"
            @keyup.enter="saveName"
          >
          <button
            v-if="editName !== user?.displayName"
            class="btn-primary text-xs px-3"
            :disabled="saving"
            @click="saveName"
          >Speichern</button>
        </div>
      </div>

      <!-- Avatar upload -->
      <div class="mb-4">
        <label class="block text-xs font-medium t-text-muted mb-1">Profilbild</label>
        <label class="btn-secondary inline-flex items-center gap-1.5 text-xs cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Bild ändern
          <input type="file" accept="image/*" class="hidden" @change="handleAvatarUpload">
        </label>
      </div>

      <!-- Logout -->
      <button class="btn-danger w-full" @click="handleLogout">Abmelden</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{ close: [] }>()

const { user, updateProfile, uploadAvatar, logout } = useAuth()
const { add: addToast } = useToast()

const editName = ref(user.value?.displayName ?? '')
const saving = ref(false)

watch(() => user.value?.displayName, (n) => { if (n) editName.value = n })

async function saveName() {
  if (!editName.value.trim() || editName.value === user.value?.displayName) return
  saving.value = true
  try {
    await updateProfile(editName.value.trim())
    addToast({ title: 'Gespeichert', message: 'Anzeigename aktualisiert', type: 'success' })
  } catch {
    addToast({ title: 'Fehler', message: 'Konnte nicht gespeichert werden', type: 'error' })
  } finally {
    saving.value = false
  }
}

async function handleAvatarUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    await uploadAvatar(file)
    addToast({ title: 'Gespeichert', message: 'Profilbild aktualisiert', type: 'success' })
  } catch {
    addToast({ title: 'Fehler', message: 'Upload fehlgeschlagen', type: 'error' })
  }
}

async function handleLogout() {
  await logout()
  navigateTo('/login')
}
</script>
