<template>
  <div class="min-h-screen t-surface-alt" :style="{ fontFamily: 'var(--theme-font)' }">
    <header class="sticky top-0 z-40 border-b t-border" :style="{ backgroundColor: 'var(--theme-nav-bg)' }">
      <div class="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <NuxtLink to="/" class="text-lg font-bold t-text">
          App
        </NuxtLink>
        <nav class="flex items-center gap-4">
          <template v-if="user">
            <span class="text-sm t-text-muted">{{ user.displayName }}</span>
            <button class="text-sm t-text-muted hover:t-text" @click="handleLogout">Logout</button>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="text-sm t-text-muted hover:t-text">Login</NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 py-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { user, logout } = useAuth()

async function handleLogout() {
  await logout()
  navigateTo('/login')
}
</script>
