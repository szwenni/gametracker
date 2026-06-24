const REFRESH_INTERVAL = 3.5 * 60 * 60 * 1000

export default defineNuxtPlugin(() => {
  const { user, refresh, logout } = useAuth()

  let timer: ReturnType<typeof setInterval> | null = null

  function startTimer() {
    stopTimer()
    timer = setInterval(async () => {
      if (!user.value) return stopTimer()
      const ok = await refresh()
      if (!ok) {
        stopTimer()
        logout()
        navigateTo('/login')
      }
    }, REFRESH_INTERVAL)
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  if (user.value) startTimer()
  watch(user, (u) => u ? startTimer() : stopTimer())

  const originalFetch = globalThis.$fetch
  if (originalFetch) {
    globalThis.$fetch = (async (input: string, opts?: Record<string, unknown>) => {
      try {
        return await originalFetch(input, opts as any)
      } catch (err: unknown) {
        const status = (err as { status?: number; statusCode?: number })?.status
          ?? (err as { status?: number; statusCode?: number })?.statusCode
        if (status === 401 && user.value && !String(input).includes('/auth/')) {
          const refreshed = await refresh()
          if (refreshed) {
            return await originalFetch(input, opts as any)
          }
          logout()
          navigateTo('/login')
        }
        throw err
      }
    }) as typeof globalThis.$fetch
  }
})
