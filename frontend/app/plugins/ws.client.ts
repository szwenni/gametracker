export default defineNuxtPlugin(() => {
  const { connect, disconnect, on } = useWebSocket()
  const { user } = useAuth()
  const { add: addToast } = useToast()

  if (user.value) {
    connect()
  }

  watch(user, (newUser) => {
    if (newUser) {
      connect()
    } else {
      disconnect(true)
    }
  })

  document.addEventListener('visibilitychange', () => {
    if (!user.value) return
    if (document.visibilityState === 'hidden') {
      disconnect()
    } else {
      connect()
    }
  })

  on('notification', (msg) => {
    const d = msg.data as { title?: string; body?: string; type?: string } | undefined
    if (d?.title) {
      addToast({
        title: d.title,
        message: d.body ?? '',
        type: 'info',
      })
    }
  })
})
