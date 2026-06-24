<template>
  <div class="fixed lg:top-4 top-16 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="rounded-xl shadow-lg border px-4 py-3 backdrop-blur-sm cursor-pointer"
        :class="bgClass(toast.type)"
        @click="remove(toast.id)"
      >
        <p class="text-sm font-semibold" :class="titleClass(toast.type)">{{ toast.title }}</p>
        <p class="text-xs mt-0.5" :class="msgClass(toast.type)">{{ toast.message }}</p>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import type { Toast } from '~/composables/useToast'

const { toasts, remove } = useToast()

function bgClass(type: Toast['type']) {
  switch (type) {
    case 'success': return 'bg-green-900/90 border-green-700'
    case 'warning': return 'bg-amber-900/90 border-amber-700'
    case 'error': return 'bg-red-900/90 border-red-700'
    default: return 'bg-slate-800/90 border-slate-600'
  }
}

function titleClass(type: Toast['type']) {
  switch (type) {
    case 'success': return 'text-green-200'
    case 'warning': return 'text-amber-200'
    case 'error': return 'text-red-200'
    default: return 'text-slate-100'
  }
}

function msgClass(type: Toast['type']) {
  switch (type) {
    case 'success': return 'text-green-300'
    case 'warning': return 'text-amber-300'
    case 'error': return 'text-red-300'
    default: return 'text-slate-300'
  }
}
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
.toast-move {
  transition: transform 0.3s ease;
}
</style>
