import { join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import crypto from 'node:crypto'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireAuth } from '../middleware/guards.js'

export async function userRoutes(app: FastifyInstance) {

  app.patch('/users/me', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.authUser!.userId
    const { displayName } = request.body as { displayName?: string }

    if (!displayName || displayName.trim().length === 0) {
      return reply.code(400).send({ error: 'displayName ist erforderlich', statusCode: 400 })
    }

    const result = await app.db.query(
      `UPDATE users SET display_name = $1 WHERE id = $2 RETURNING id, username, display_name, avatar_path, global_role, created_at, updated_at`,
      [displayName.trim(), userId]
    )

    const u = result.rows[0]
    return {
      user: {
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarPath: u.avatar_path,
        globalRole: u.global_role,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }
    }
  })

  app.post('/users/me/avatar', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.authUser!.userId

    const data = await request.file()
    if (!data) {
      return reply.code(400).send({ error: 'Keine Datei hochgeladen', statusCode: 400 })
    }

    const ext = data.filename.split('.').pop()?.toLowerCase() ?? 'jpg'
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    if (!allowedExts.includes(ext)) {
      return reply.code(400).send({ error: 'Ungültiges Dateiformat. Erlaubt: jpg, png, webp, gif', statusCode: 400 })
    }

    const avatarDir = join(process.cwd(), 'public', 'uploads', 'avatars')
    await mkdir(avatarDir, { recursive: true })

    const filename = `${userId}-${crypto.randomBytes(4).toString('hex')}.${ext}`
    const filepath = join(avatarDir, filename)
    const buffer = await data.toBuffer()
    await writeFile(filepath, buffer)

    const avatarPath = `/uploads/avatars/${filename}`

    const result = await app.db.query(
      `UPDATE users SET avatar_path = $1 WHERE id = $2 RETURNING id, username, display_name, avatar_path, global_role, created_at, updated_at`,
      [avatarPath, userId]
    )

    const u = result.rows[0]
    return {
      user: {
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarPath: u.avatar_path,
        globalRole: u.global_role,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }
    }
  })
}
