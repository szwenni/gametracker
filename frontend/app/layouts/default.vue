<template>
  <div class="min-h-screen flex flex-col" :style="{ fontFamily: 'var(--theme-font)', backgroundColor: 'var(--theme-surface-alt)' }">
    <header class="sticky top-0 z-40 safe-top" :style="{ backgroundColor: 'var(--theme-nav-bg)', backdropFilter: 'var(--theme-glass-blur)', WebkitBackdropFilter: 'var(--theme-glass-blur)' }">
      <div class="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between border-b" style="border-color: var(--theme-border)">
        <button v-if="user" class="flex items-center gap-2.5 min-w-0" @click="showProfile = !showProfile">
          <div class="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center" style="background-color: var(--theme-primary-soft)">
            <img v-if="user.avatarPath" :src="user.avatarPath" class="w-full h-full object-cover" alt="">
            <svg v-else class="w-4 h-4" style="color: var(--theme-primary)" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
            </svg>
          </div>
          <span class="text-sm font-medium truncate" style="color: var(--theme-text)">{{ user.displayName }}</span>
        </button>
        <span v-else />
        <span class="text-sm font-bold" style="color: var(--theme-text-muted)">Spieletracker</span>
      </div>
    </header>

    <!-- Profile popover -->
    <ProfilePopover v-if="showProfile" @close="showProfile = false" />

    <main class="flex-1 safe-main-bottom">
      <slot />
    </main>

    <!-- Admin bottom nav -->
    <nav v-if="user?.globalRole === 'admin'" class="fixed bottom-0 inset-x-0 z-50 safe-bottom" :style="{ backgroundColor: 'var(--theme-nav-bg)', backdropFilter: 'var(--theme-glass-blur)', WebkitBackdropFilter: 'var(--theme-glass-blur)', borderTop: '1px solid var(--theme-border)' }">
      <div class="max-w-lg mx-auto flex justify-center py-2">
        <NuxtLink to="/admin" class="nav-item" :class="{ 'nav-item-active': $route.path === '/admin' }">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-[10px]">Einstellungen</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth()
const showProfile = ref(false)
</script>

<style scoped>
.safe-top {
  padding-top: env(safe-area-inset-top);
}
.safe-main-bottom {
  padding-bottom: calc(env(safe-area-inset-bottom) + 5rem);
}
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
.nav-item {
  @apply flex flex-col items-center gap-0.5 transition-colors px-4 py-1;
  color: var(--theme-nav-text);
}
.nav-item-active {
  color: var(--theme-primary);
}
</style>
