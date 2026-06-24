export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',

  future: {
    compatibilityVersion: 4
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@vite-pwa/nuxt',
  ],

  pwa: {
    registerType: 'autoUpdate',
    scope: '/',
    manifest: '/manifest.json',
    workbox: {
      navigateFallback: undefined,
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      importScripts: ['/sw-push.js'],
      runtimeCaching: [
        {
          urlPattern: /^https?:\/\/.*\/api\/v1\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: { maxEntries: 100, maxAgeSeconds: 300 }
          }
        }
      ]
    },
    client: {
      installPrompt: true
    },
    devOptions: {
      enabled: true,
      navigateFallback: undefined
    }
  },

  css: ['~/assets/css/main.css'],

  devtools: { enabled: true },

  runtimeConfig: {
    backendUrl: '',
    public: {
      appName: 'Spieletracker',
      appDomain: 'localhost',
      wsUrl: ''
    }
  },

  alias: {
    '@shared': '../shared'
  },

  devServer: {
    port: 3000,
    host: '0.0.0.0'
  }
})
