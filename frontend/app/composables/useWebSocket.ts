export interface WsMessage {
  event: string
  channel?: string
  data?: unknown
  ts?: number
}

type WsHandler = (msg: WsMessage) => void

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

const MAX_RECONNECT_DELAY = 30_000
const INITIAL_RECONNECT_DELAY = 1_000
const PING_INTERVAL = 25_000

let _socket: WebSocket | null = null
let _reconnectAttempt = 0
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null
let _pingTimer: ReturnType<typeof setInterval> | null = null

export function useWebSocket() {
  const status = useState<ConnectionStatus>('ws-status', () => 'disconnected')
  const lastMessage = useState<WsMessage | null>('ws-last-message', () => null)

  if (import.meta.server) {
    return {
      status: readonly(status),
      lastMessage: readonly(lastMessage),
      connect: () => {},
      disconnect: (_permanent?: boolean) => {},
      subscribe: (_channel: string) => {},
      unsubscribe: (_channel: string) => {},
      on: (_event: string, _handler: WsHandler) => {},
      off: (_event: string, _handler: WsHandler) => {}
    }
  }

  const handlers = useState<Record<string, WsHandler[]>>('ws-handlers', () => ({}))
  const subscribedChannels = useState<string[]>('ws-channels', () => [])

  function getWsUrl(): string {
    const config = useRuntimeConfig()
    const publicWsUrl = config.public.wsUrl as string

    if (publicWsUrl) {
      return publicWsUrl.endsWith('/ws') ? publicWsUrl : publicWsUrl + '/ws'
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const hostname = window.location.hostname
    const port = window.location.port

    const proxyPorts = ['80', '443', '3555', '3556']
    if (port && !proxyPorts.includes(port)) {
      return `${proto}//${hostname}:3001/ws`
    }

    return `${proto}//${hostname}${port && !['80', '443'].includes(port) ? ':' + port : ''}/ws`
  }

  function emit(event: string, msg: WsMessage) {
    const eventHandlers = handlers.value[event]
    if (eventHandlers) {
      for (const handler of eventHandlers) {
        try { handler(msg) } catch (err) { console.error(`WS handler error for ${event}:`, err) }
      }
    }
    const wildcardHandlers = handlers.value['*']
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try { handler(msg) } catch (err) { console.error('WS wildcard handler error:', err) }
      }
    }
  }

  function startPing() {
    stopPing()
    _pingTimer = setInterval(() => {
      if (_socket?.readyState === WebSocket.OPEN) {
        _socket.send(JSON.stringify({ type: 'ping' }))
      }
    }, PING_INTERVAL)
  }

  function stopPing() {
    if (_pingTimer) {
      clearInterval(_pingTimer)
      _pingTimer = null
    }
  }

  function connect() {
    if (_socket?.readyState === WebSocket.OPEN || _socket?.readyState === WebSocket.CONNECTING) {
      return
    }

    status.value = _reconnectAttempt > 0 ? 'reconnecting' : 'connecting'

    try {
      _socket = new WebSocket(getWsUrl())
    } catch {
      scheduleReconnect()
      return
    }

    _socket.onopen = () => {
      status.value = 'connected'
      _reconnectAttempt = 0
      startPing()

      if (subscribedChannels.value.length > 0) {
        _socket!.send(JSON.stringify({ type: 'subscribe_many', channels: subscribedChannels.value }))
      }
    }

    _socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage
        lastMessage.value = msg
        emit(msg.event, msg)
      } catch {
        // ignore malformed
      }
    }

    _socket.onclose = () => {
      status.value = 'disconnected'
      stopPing()
      scheduleReconnect()
    }

    _socket.onerror = () => {}
  }

  function disconnect(permanent = false) {
    if (_reconnectTimer) {
      clearTimeout(_reconnectTimer)
      _reconnectTimer = null
    }
    stopPing()
    if (permanent) {
      _reconnectAttempt = -1
    } else {
      _reconnectAttempt = 0
    }
    if (_socket) {
      _socket.onclose = null
      _socket.close()
      _socket = null
    }
    status.value = 'disconnected'
  }

  function scheduleReconnect() {
    if (_reconnectAttempt < 0) return
    const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(2, _reconnectAttempt), MAX_RECONNECT_DELAY)
    _reconnectAttempt++
    _reconnectTimer = setTimeout(connect, delay)
  }

  function subscribe(channel: string) {
    if (!subscribedChannels.value.includes(channel)) {
      subscribedChannels.value.push(channel)
    }
    if (_socket?.readyState === WebSocket.OPEN) {
      _socket.send(JSON.stringify({ type: 'subscribe', channel }))
    }
  }

  function unsubscribe(channel: string) {
    const idx = subscribedChannels.value.indexOf(channel)
    if (idx !== -1) subscribedChannels.value.splice(idx, 1)
    if (_socket?.readyState === WebSocket.OPEN) {
      _socket.send(JSON.stringify({ type: 'unsubscribe', channel }))
    }
  }

  function on(event: string, handler: WsHandler) {
    if (!handlers.value[event]) {
      handlers.value[event] = []
    }
    handlers.value[event].push(handler)
  }

  function off(event: string, handler: WsHandler) {
    const eventHandlers = handlers.value[event]
    if (eventHandlers) {
      handlers.value[event] = eventHandlers.filter(h => h !== handler)
    }
  }

  return {
    status: readonly(status),
    lastMessage: readonly(lastMessage),
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    on,
    off
  }
}
