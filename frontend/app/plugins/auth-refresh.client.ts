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
})
