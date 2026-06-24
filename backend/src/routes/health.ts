import type { FastifyInstance } from 'fastify'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    const checks: Record<string, string> = {}

    try {
      const result = await app.db.query('SELECT 1 AS ok')
      checks.database = result.rows[0]?.ok === 1 ? 'ok' : 'degraded'
    } catch {
      checks.database = 'down'
    }

    const allOk = Object.values(checks).every(v => v === 'ok')

    reply.code(allOk ? 200 : 503).send({
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks
    })
  })
}
