import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireAuth } from '../middleware/guards.js'

export async function pushRoutes(app: FastifyInstance) {
  app.post('/push/subscribe', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { endpoint, keys } = request.body as {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return reply.code(400).send({ error: 'Invalid subscription data', statusCode: 400 })
    }

    const userId = request.authUser!.userId

    await app.db.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET keys_p256dh = $3, keys_auth = $4`,
      [userId, endpoint, keys.p256dh, keys.auth]
    )

    return { success: true }
  })

  app.post('/push/unsubscribe', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest) => {
    const { endpoint } = request.body as { endpoint: string }
    const userId = request.authUser!.userId

    await app.db.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [userId, endpoint]
    )

    return { success: true }
  })

  app.get('/push/vapid-key', async () => {
    const key = process.env.VAPID_PUBLIC_KEY ?? ''
    return { publicKey: key }
  })
}
