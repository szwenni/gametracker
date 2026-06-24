export default defineNuxtRouteMiddleware(async () => {
  const { user, init } = useAuth()
  if (!user.value) {
    await init()
  }
})
