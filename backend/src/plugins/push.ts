import fp from 'fastify-plugin'
import webpush from 'web-push'
import type { FastifyInstance } from 'fastify'

export interface PushService {
  sendToUser(userId: string, title: string, body: string, data?: Record<string, unknown>): Promise<void>
  sendToUsers(userIds: string[], title: string, body: string, data?: Record<string, unknown>): Promise<void>
}

declare module 'fastify' {
  interface FastifyInstance {
    push: PushService
  }
}

async function pushPlugin(app: FastifyInstance) {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com'

  if (!vapidPublicKey || !vapidPrivateKey) {
    app.log.warn('VAPID keys not set — push notifications disabled. Generate with: npx web-push generate-vapid-keys')
    app.decorate('push', {
      sendToUser: async () => {},
      sendToUsers: async () => {}
    } satisfies PushService)
    return
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  async function sendToSubscriptions(subscriptions: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>, payload: string) {
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await app.db.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id])
          app.log.info(`Removed expired push subscription ${sub.id}`)
        } else {
          app.log.error(err, `Failed to send push to ${sub.endpoint}`)
        }
      }
    }
  }

  const pushService: PushService = {
    async sendToUser(userId, title, body, data) {
      const result = await app.db.query(
        'SELECT id, endpoint, keys_p256dh AS p256dh, keys_auth AS auth FROM push_subscriptions WHERE user_id = $1',
        [userId]
      )
      if (result.rows.length > 0) {
        await sendToSubscriptions(result.rows, JSON.stringify({ title, body, data }))
      }
    },

    async sendToUsers(userIds, title, body, data) {
      if (userIds.length === 0) return
      const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ')
      const result = await app.db.query(
        `SELECT id, endpoint, keys_p256dh AS p256dh, keys_auth AS auth FROM push_subscriptions WHERE user_id IN (${placeholders})`,
        userIds
      )
      if (result.rows.length > 0) {
        await sendToSubscriptions(result.rows, JSON.stringify({ title, body, data }))
      }
    }
  }

  app.decorate('push', pushService)
  app.log.info('Push notification service initialized')
}

export default fp(pushPlugin, {
  name: 'push',
  dependencies: ['db']
})
