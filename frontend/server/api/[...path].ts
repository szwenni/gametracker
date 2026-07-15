export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const target = `${config.backendUrl}${event.path}`

  return proxyRequest(event, target, {
    headers: {
      'x-forwarded-host': getRequestHeader(event, 'host') ?? ''
    }
  })
})
