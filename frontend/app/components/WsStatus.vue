<template>
  <Transition name="fade">
    <div
      v-if="visible"
      class="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-sm transition-all"
      :class="classes"
    >
      <span class="relative flex h-2 w-2">
        <span
          v-if="status === 'connected'"
          class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
        />
        <span class="relative inline-flex h-2 w-2 rounded-full" :class="dotClass" />
      </span>
      <span>{{ label }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { status } = useWebSocket()

const visible = computed(() => status.value !== 'connected')

const label = computed(() => {
  switch (status.value) {
    case 'connecting': return 'Connecting...'
    case 'reconnecting': return 'Reconnecting...'
    case 'disconnected': return 'Offline'
    case 'connected': return 'Live'
    default: return ''
  }
})

const classes = computed(() => {
  switch (status.value) {
    case 'connected': return 'bg-green-50/90 text-green-700 border border-green-200'
    case 'connecting':
    case 'reconnecting': return 'bg-amber-50/90 text-amber-700 border border-amber-200'
    case 'disconnected': return 'bg-red-50/90 text-red-700 border border-red-200'
    default: return ''
  }
})

const dotClass = computed(() => {
  switch (status.value) {
    case 'connected': return 'bg-green-500'
    case 'connecting':
    case 'reconnecting': return 'bg-amber-500'
    case 'disconnected': return 'bg-red-500'
    default: return 'bg-gray-400'
  }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
