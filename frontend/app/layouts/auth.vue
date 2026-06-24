<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8" :style="{ fontFamily: 'var(--theme-font)', backgroundColor: 'var(--theme-surface-alt)' }">
    <div class="w-full max-w-sm">
      <slot />
    </div>
  </div>
</template>
