import { join } from 'node:path'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import dbPlugin from './plugins/db.js'
import authPlugin from './plugins/auth.js'
import seedPlugin from './plugins/seed.js'
import wsPlugin from './plugins/ws.js'
import pushPlugin from './plugins/push.js'
import notifyPlugin from './plugins/notify.js'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { pushRoutes } from './routes/push.js'
import { userRoutes } from './routes/users.js'
import { adminRoutes } from './routes/admin.js'
import { gameRoutes } from './routes/games.js'

const envToLogger: Record<string, unknown> = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
    }
  },
  production: true
}

const env = process.env.NODE_ENV ?? 'development'

async function start() {
  const app = Fastify({
    logger: envToLogger[env] ?? true
  })

  // CORS — replace YOUR_DOMAIN with your actual domain
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || origin.includes('localhost') || origin.includes('gametracker.kropro.cloud')) {
        cb(null, true)
      } else {
        cb(new Error('Not allowed by CORS: ' + origin), false)
      }
    },
    credentials: true
  })

  await app.register(cookie)
  await app.register(multipart)

  await app.register(rateLimit, {
    max: 600,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip
  })

  // Core plugins (order matters: db → auth → seed → push → ws → notify)
  await app.register(dbPlugin)
  await app.register(authPlugin)
  await app.register(seedPlugin)
  await app.register(pushPlugin)
  await app.register(wsPlugin)
  await app.register(notifyPlugin)

  // Routes
  await app.register(healthRoutes, { prefix: '/api/v1' })
  await app.register(authRoutes, { prefix: '/api/v1' })
  await app.register(userRoutes, { prefix: '/api/v1' })
  await app.register(adminRoutes, { prefix: '/api/v1' })
  await app.register(gameRoutes, { prefix: '/api/v1' })
  await app.register(pushRoutes, { prefix: '/api/v1' })

  // Serve static files (uploads, etc.)
  await app.register(fastifyStatic, {
    root: join(process.cwd(), 'public'),
    prefix: '/',
    decorateReply: true
  })

  const port = parseInt(process.env.PORT ?? '3101', 10)
  const host = process.env.HOST ?? '0.0.0.0'

  await app.listen({ port, host })

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`)
    try {
      await app.close()
      process.exit(0)
    } catch (err) {
      app.log.error(err, 'Error during shutdown')
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start()
