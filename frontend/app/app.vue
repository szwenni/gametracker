<template>
  <div :style="cssVars" :data-theme="templateId">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <ToastContainer />
      <WsStatus />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const { cssVars, templateId } = useTheme()

useHead({
  title: 'Spieletracker',
  htmlAttrs: { lang: 'de' },
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
  ],
})
</script>
