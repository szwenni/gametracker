import crypto from 'node:crypto'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireRole } from '../middleware/guards.js'

export async function adminRoutes(app: FastifyInstance) {

  app.post('/admin/invitations', {
    preHandler: [requireRole('admin')]
  }, async (request: FastifyRequest) => {
    const userId = request.authUser!.userId
    const token = crypto.randomBytes(32).toString('base64url')

    const result = await app.db.query(
      `INSERT INTO app_invitations (token, created_by) VALUES ($1, $2) RETURNING id, token, created_at`,
      [token, userId]
    )

    return { invitation: result.rows[0] }
  })

  app.get('/admin/invitations', {
    preHandler: [requireRole('admin')]
  }, async () => {
    const result = await app.db.query(`
      SELECT
        ai.id, ai.token, ai.created_at, ai.used_at,
        creator.display_name AS created_by_name,
        used_user.display_name AS used_by_name,
        used_user.username AS used_by_username
      FROM app_invitations ai
      JOIN users creator ON ai.created_by = creator.id
      LEFT JOIN users used_user ON ai.used_by = used_user.id
      ORDER BY ai.created_at DESC
    `)

    return {
      invitations: result.rows.map(r => ({
        id: r.id,
        token: r.token,
        createdByName: r.created_by_name,
        usedByName: r.used_by_name,
        usedByUsername: r.used_by_username,
        usedAt: r.used_at,
        createdAt: r.created_at
      }))
    }
  })

  app.delete('/admin/invitations/:id', {
    preHandler: [requireRole('admin')]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }

    const result = await app.db.query(
      'DELETE FROM app_invitations WHERE id = $1 AND used_by IS NULL RETURNING id',
      [id]
    )

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: 'Einladung nicht gefunden oder bereits verwendet', statusCode: 404 })
    }

    return { success: true }
  })
}
