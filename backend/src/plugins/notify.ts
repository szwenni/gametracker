import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

export interface NotifyService {
  notifyUser(userId: string, title: string, body: string, data?: Record<string, unknown>): Promise<void>
  notifyUsers(userIds: string[], title: string, body: string, data?: Record<string, unknown>): Promise<void>
}

declare module 'fastify' {
  interface FastifyInstance {
    notify: NotifyService
  }
}

async function notifyPlugin(app: FastifyInstance) {

  async function persistNotifications(userIds: string[], title: string, body: string, data?: Record<string, unknown>) {
    if (userIds.length === 0) return
    try {
      const values: string[] = []
      const params: unknown[] = []
      let idx = 1
      for (const uid of userIds) {
        values.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`)
        params.push(uid, title, body, data?.type ?? null, JSON.stringify(data ?? {}))
        idx += 5
      }
      await app.db.query(
        `INSERT INTO notifications (user_id, title, body, type, data) VALUES ${values.join(', ')}`,
        params
      )
    } catch (err) {
      app.log.error({ err }, 'Failed to persist notifications')
    }
  }

  async function deliverToUsers(userIds: string[], title: string, body: string, data?: Record<string, unknown>) {
    if (userIds.length === 0) return

    const wsPayload = { title, body, ...data }

    for (const uid of userIds) {
      if (app.pubsub.isUserConnected(uid)) {
        app.pubsub.publishToUser(uid, 'notification', wsPayload)
      } else {
        await app.push.sendToUser(uid, title, body, data)
      }
    }

    persistNotifications(userIds, title, body, data)
  }

  const notifyService: NotifyService = {
    async notifyUser(userId, title, body, data) {
      await deliverToUsers([userId], title, body, data)
    },

    async notifyUsers(userIds, title, body, data) {
      await deliverToUsers(userIds, title, body, data)
    }
  }

  app.decorate('notify', notifyService)
  app.log.info('Notification service initialized')
}

export default fp(notifyPlugin, {
  name: 'notify',
  dependencies: ['db', 'ws', 'push']
})
