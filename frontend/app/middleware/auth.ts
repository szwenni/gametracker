export default defineNuxtRouteMiddleware((to) => {
  const { user } = useAuth()

  if (!user.value && to.path !== '/login' && !to.path.startsWith('/join/')) {
    return navigateTo('/login')
  }
})
