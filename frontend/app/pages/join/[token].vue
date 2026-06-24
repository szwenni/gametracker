<template>
  <div>
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold t-text mb-1">Willkommen!</h1>
      <p class="text-sm t-text-muted">Erstelle deinen Account für den Spieletracker</p>
    </div>

    <!-- Step 1: Credentials -->
    <form v-if="step === 1" class="space-y-4" @submit.prevent="nextStep">
      <div>
        <label class="block text-xs font-medium t-text-muted mb-1">Benutzername</label>
        <input v-model="form.username" type="text" class="field-input" autocomplete="username" required minlength="3">
        <p class="text-[11px] t-text-muted mt-1">Mind. 3 Zeichen, nur Kleinbuchstaben und Zahlen</p>
      </div>

      <div>
        <label class="block text-xs font-medium t-text-muted mb-1">Passwort</label>
        <input v-model="form.password" type="password" class="field-input" autocomplete="new-password" required minlength="6">
      </div>

      <div>
        <label class="block text-xs font-medium t-text-muted mb-1">Passwort wiederholen</label>
        <input v-model="form.passwordConfirm" type="password" class="field-input" autocomplete="new-password" required>
      </div>

      <p v-if="error" class="text-xs text-red-400">{{ error }}</p>

      <button type="submit" class="btn-primary w-full">Weiter</button>
    </form>

    <!-- Step 2: Profile -->
    <form v-else-if="step === 2" class="space-y-4" @submit.prevent="handleRegister">
      <div>
        <label class="block text-xs font-medium t-text-muted mb-1">Anzeigename</label>
        <input v-model="form.displayName" type="text" class="field-input" required>
        <p class="text-[11px] t-text-muted mt-1">So wirst du in Spielen angezeigt</p>
      </div>

      <div>
        <label class="block text-xs font-medium t-text-muted mb-1">Profilbild (optional)</label>
        <div class="flex items-center gap-3">
          <div class="w-16 h-16 rounded-full overflow-hidden shrink-0 flex items-center justify-center" style="background-color: var(--theme-primary-soft)">
            <img v-if="avatarPreview" :src="avatarPreview" class="w-full h-full object-cover" alt="">
            <svg v-else class="w-8 h-8" style="color: var(--theme-primary)" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
            </svg>
          </div>
          <label class="btn-secondary text-xs cursor-pointer">
            Bild wählen
            <input type="file" accept="image/*" class="hidden" @change="handleFileSelect">
          </label>
        </div>
      </div>

      <p v-if="error" class="text-xs text-red-400">{{ error }}</p>

      <div class="flex gap-2">
        <button type="button" class="btn-secondary flex-1" @click="step = 1">Zurück</button>
        <button type="submit" class="btn-primary flex-1" :disabled="submitting">
          {{ submitting ? 'Wird erstellt...' : 'Account erstellen' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const { register, uploadAvatar } = useAuth()

const token = route.params.token as string

const step = ref(1)
const error = ref('')
const submitting = ref(false)
const avatarFile = ref<File | null>(null)
const avatarPreview = ref('')

const form = reactive({
  username: '',
  password: '',
  passwordConfirm: '',
  displayName: ''
})

function nextStep() {
  error.value = ''
  if (form.password !== form.passwordConfirm) {
    error.value = 'Passwörter stimmen nicht überein'
    return
  }
  if (!/^[a-z0-9_]{3,}$/.test(form.username)) {
    error.value = 'Benutzername: mind. 3 Zeichen, nur Kleinbuchstaben, Zahlen und _'
    return
  }
  form.displayName = form.displayName || form.username
  step.value = 2
}

function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  avatarFile.value = file
  avatarPreview.value = URL.createObjectURL(file)
}

async function handleRegister() {
  error.value = ''
  submitting.value = true
  try {
    await register(token, form.username, form.password, form.displayName)
    if (avatarFile.value) {
      await uploadAvatar(avatarFile.value)
    }
    navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.error ?? 'Registrierung fehlgeschlagen'
  } finally {
    submitting.value = false
  }
}
</script>
