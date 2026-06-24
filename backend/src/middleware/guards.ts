import type { FastifyRequest, FastifyReply } from 'fastify'

export function requireAuth(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!request.authUser) {
    reply.code(401).send({ error: 'Authentication required', statusCode: 401 })
    return
  }
  done()
}

export function requireRole(...roles: string[]) {
  return function (request: FastifyRequest, reply: FastifyReply, done: () => void) {
    if (!request.authUser) {
      reply.code(401).send({ error: 'Authentication required', statusCode: 401 })
      return
    }
    if (!roles.includes(request.authUser.globalRole)) {
      reply.code(403).send({ error: 'Insufficient permissions', statusCode: 403 })
      return
    }
    done()
  }
}
