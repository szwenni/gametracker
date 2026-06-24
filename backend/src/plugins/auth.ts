import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { TokenPayload } from '../../shared/types/auth.js'
import type { AuthAdapter } from '../adapters/auth.js'
import { JwtAuthAdapter } from '../adapters/jwt-auth.js'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload
    user: TokenPayload
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    auth: AuthAdapter
  }
  interface FastifyRequest {
    authUser: TokenPayload | null
  }
}

async function authPlugin(app: FastifyInstance) {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  await app.register(jwt, {
    secret: jwtSecret,
    cookie: {
      cookieName: 'access_token',
      signed: false
    }
  })

  const authAdapter = new JwtAuthAdapter(app, app.db)
  app.decorate('auth', authAdapter)
  app.decorateRequest('authUser', null)

  app.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
    const token =
      request.cookies.access_token ??
      request.headers.authorization?.replace('Bearer ', '')

    if (token) {
      request.authUser = authAdapter.verifyAccessToken(token)
    }
  })
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['db']
})
