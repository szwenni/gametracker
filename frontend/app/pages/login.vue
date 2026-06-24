<template>
  <div>
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold t-text mb-1">Spieletracker</h1>
      <p class="text-sm t-text-muted">Melde dich an um fortzufahren</p>
    </div>

    <form class="space-y-4" @submit.prevent="handleLogin">
      <div>
        <label class="block text-xs font-medium t-text-muted mb-1">Benutzername</label>
        <input v-model="username" type="text" class="field-input" autocomplete="username" required>
      </div>

      <div>
        <label class="block text-xs font-medium t-text-muted mb-1">Passwort</label>
        <input v-model="password" type="password" class="field-input" autocomplete="current-password" required>
      </div>

      <p v-if="error" class="text-xs text-red-400">{{ error }}</p>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? 'Anmelden...' : 'Anmelden' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { login, user } = useAuth()

if (user.value) {
  navigateTo('/')
}

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await login(username.value, password.value)
    navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.error ?? 'Anmeldung fehlgeschlagen'
  } finally {
    loading.value = false
  }
}
</script>
