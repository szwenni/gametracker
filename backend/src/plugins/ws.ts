import fp from 'fastify-plugin'
import websocket from '@fastify/websocket'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { WebSocket } from 'ws'

export interface WsClient {
  socket: WebSocket
  userId: string | null
  channels: Set<string>
}

export interface PubSub {
  clients: Set<WsClient>
  subscribe(client: WsClient, channel: string): void
  unsubscribe(client: WsClient, channel: string): void
  publish(channel: string, event: string, data: unknown): void
  publishToUser(userId: string, event: string, data: unknown): void
  isUserConnected(userId: string): boolean
}

declare module 'fastify' {
  interface FastifyInstance {
    pubsub: PubSub
  }
}

async function wsPlugin(app: FastifyInstance) {
  await app.register(websocket)

  const clients = new Set<WsClient>()

  const pubsub: PubSub = {
    clients,

    subscribe(client, channel) {
      client.channels.add(channel)
    },

    unsubscribe(client, channel) {
      client.channels.delete(channel)
    },

    publish(channel, event, data) {
      const msg = JSON.stringify({ event, channel, data, ts: Date.now() })
      for (const client of clients) {
        if (client.channels.has(channel) && client.socket.readyState === 1) {
          client.socket.send(msg)
        }
      }
    },

    publishToUser(userId, event, data) {
      const msg = JSON.stringify({ event, data, ts: Date.now() })
      for (const client of clients) {
        if (client.userId === userId && client.socket.readyState === 1) {
          client.socket.send(msg)
        }
      }
    },

    isUserConnected(userId) {
      for (const client of clients) {
        if (client.userId === userId && client.socket.readyState === 1) return true
      }
      return false
    }
  }

  app.decorate('pubsub', pubsub)

  app.get('/ws', { websocket: true }, (socket: WebSocket, request: FastifyRequest) => {
    const client: WsClient = {
      socket,
      userId: request.authUser?.userId ?? null,
      channels: new Set()
    }
    clients.add(client)

    app.log.info(`WS connected (userId: ${client.userId ?? 'anonymous'}, total: ${clients.size})`)

    socket.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; channel?: string; channels?: string[] }

        if (msg.type === 'subscribe' && msg.channel) {
          pubsub.subscribe(client, msg.channel)
          socket.send(JSON.stringify({ event: 'subscribed', channel: msg.channel }))
        }

        if (msg.type === 'subscribe_many' && msg.channels) {
          for (const ch of msg.channels) {
            pubsub.subscribe(client, ch)
          }
          socket.send(JSON.stringify({ event: 'subscribed', channels: msg.channels }))
        }

        if (msg.type === 'unsubscribe' && msg.channel) {
          pubsub.unsubscribe(client, msg.channel)
        }

        if (msg.type === 'ping') {
          socket.send(JSON.stringify({ event: 'pong' }))
        }
      } catch {
        // ignore malformed messages
      }
    })

    socket.on('close', () => {
      clients.delete(client)
      app.log.info(`WS disconnected (total: ${clients.size})`)
    })
  })
}

export default fp(wsPlugin, {
  name: 'ws',
  dependencies: ['auth']
})
