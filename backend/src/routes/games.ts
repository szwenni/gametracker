import crypto from 'node:crypto'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireAuth } from '../middleware/guards.js'

export async function gameRoutes(app: FastifyInstance) {

  // Create a new game
  app.post('/games', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest) => {
    const userId = request.authUser!.userId
    const { name, type } = request.body as { name: string; type: 'generic' | 'phase10' }

    const result = await app.db.query(
      `INSERT INTO games (name, type, created_by) VALUES ($1, $2, $3) RETURNING id, name, type, status, created_at`,
      [name, type ?? 'generic', userId]
    )

    const game = result.rows[0]

    // Auto-join the creator
    await app.db.query(
      `INSERT INTO game_players (game_id, user_id) VALUES ($1, $2)`,
      [game.id, userId]
    )

    // For phase10, initialize phases for the creator
    if (type === 'phase10') {
      await initPhases(app, game.id, userId)
    }

    return { game: { ...game, createdBy: userId } }
  })

  // List games for current user
  app.get('/games', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest) => {
    const userId = request.authUser!.userId

    const result = await app.db.query(`
      SELECT g.id, g.name, g.type, g.status, g.created_by, g.created_at, g.ended_at,
        creator.display_name AS creator_name,
        (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) AS player_count
      FROM games g
      JOIN game_players gp ON gp.game_id = g.id AND gp.user_id = $1
      JOIN users creator ON g.created_by = creator.id
      ORDER BY g.status ASC, g.created_at DESC
    `, [userId])

    return {
      games: result.rows.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        status: r.status,
        createdBy: r.created_by,
        creatorName: r.creator_name,
        playerCount: parseInt(r.player_count),
        createdAt: r.created_at,
        endedAt: r.ended_at
      }))
    }
  })

  // Get full game state
  app.get('/games/:id', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const userId = request.authUser!.userId

    const gameResult = await app.db.query(
      `SELECT g.* FROM games g JOIN game_players gp ON gp.game_id = g.id AND gp.user_id = $2 WHERE g.id = $1`,
      [id, userId]
    )

    if (gameResult.rowCount === 0) {
      return reply.code(404).send({ error: 'Spiel nicht gefunden', statusCode: 404 })
    }

    const game = gameResult.rows[0]
    return await buildGameState(app, game)
  })

  // End a game
  app.patch('/games/:id', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const userId = request.authUser!.userId
    const { status } = request.body as { status: string }

    const gameResult = await app.db.query('SELECT created_by, status FROM games WHERE id = $1', [id])
    if (gameResult.rowCount === 0) {
      return reply.code(404).send({ error: 'Spiel nicht gefunden', statusCode: 404 })
    }
    if (gameResult.rows[0].created_by !== userId) {
      return reply.code(403).send({ error: 'Nur der Ersteller kann das Spiel beenden', statusCode: 403 })
    }

    if (status === 'ended') {
      await app.db.query(
        `UPDATE games SET status = 'ended', ended_at = NOW() WHERE id = $1`,
        [id]
      )
      app.pubsub.publish(`game:${id}`, 'game:ended', { gameId: id })
    }

    return { success: true }
  })

  // Join a game via invitation code
  app.post('/games/:id/join', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const userId = request.authUser!.userId
    const { code } = request.body as { code: string }

    const invite = await app.db.query(
      'SELECT id FROM game_invitations WHERE game_id = $1 AND code = $2',
      [id, code.toUpperCase()]
    )

    if (invite.rowCount === 0) {
      return reply.code(400).send({ error: 'Ungültiger Einladungscode', statusCode: 400 })
    }

    // Check if already a member
    const existing = await app.db.query(
      'SELECT 1 FROM game_players WHERE game_id = $1 AND user_id = $2',
      [id, userId]
    )
    if (existing.rowCount && existing.rowCount > 0) {
      return { success: true, alreadyJoined: true }
    }

    await app.db.query(
      'INSERT INTO game_players (game_id, user_id) VALUES ($1, $2)',
      [id, userId]
    )

    // For phase10, initialize phases for the new player
    const game = await app.db.query('SELECT type FROM games WHERE id = $1', [id])
    if (game.rows[0]?.type === 'phase10') {
      await initPhases(app, id, userId)
    }

    const userResult = await app.db.query(
      'SELECT display_name, avatar_path FROM users WHERE id = $1',
      [userId]
    )
    const player = userResult.rows[0]

    app.pubsub.publish(`game:${id}`, 'game:player_joined', {
      gameId: id,
      userId,
      displayName: player.display_name,
      avatarPath: player.avatar_path
    })

    return { success: true }
  })

  // Generate game invitation code
  app.post('/games/:id/invitations', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const userId = request.authUser!.userId

    const gameResult = await app.db.query('SELECT created_by FROM games WHERE id = $1', [id])
    if (gameResult.rowCount === 0) {
      return reply.code(404).send({ error: 'Spiel nicht gefunden', statusCode: 404 })
    }
    if (gameResult.rows[0].created_by !== userId) {
      return reply.code(403).send({ error: 'Nur der Ersteller kann Einladungen erstellen', statusCode: 403 })
    }

    const code = crypto.randomBytes(3).toString('hex').toUpperCase()

    const result = await app.db.query(
      `INSERT INTO game_invitations (game_id, code, created_by) VALUES ($1, $2, $3) RETURNING id, code, created_at`,
      [id, code, userId]
    )

    return { invitation: result.rows[0] }
  })

  // List game invitation codes
  app.get('/games/:id/invitations', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const userId = request.authUser!.userId

    const gameResult = await app.db.query('SELECT created_by FROM games WHERE id = $1', [id])
    if (gameResult.rowCount === 0) {
      return reply.code(404).send({ error: 'Spiel nicht gefunden', statusCode: 404 })
    }
    if (gameResult.rows[0].created_by !== userId) {
      return reply.code(403).send({ error: 'Nur der Ersteller kann Einladungen sehen', statusCode: 403 })
    }

    const result = await app.db.query(
      'SELECT id, code, created_at FROM game_invitations WHERE game_id = $1 ORDER BY created_at DESC',
      [id]
    )

    return { invitations: result.rows }
  })

  // Add a new round
  app.post('/games/:id/rounds', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const userId = request.authUser!.userId

    const gameResult = await app.db.query('SELECT created_by, status FROM games WHERE id = $1', [id])
    if (gameResult.rowCount === 0) {
      return reply.code(404).send({ error: 'Spiel nicht gefunden', statusCode: 404 })
    }
    if (gameResult.rows[0].created_by !== userId) {
      return reply.code(403).send({ error: 'Nur der Ersteller kann Runden hinzufügen', statusCode: 403 })
    }
    if (gameResult.rows[0].status === 'ended') {
      return reply.code(400).send({ error: 'Spiel ist bereits beendet', statusCode: 400 })
    }

    const lastRound = await app.db.query(
      'SELECT COALESCE(MAX(round_number), 0) AS max_round FROM game_rounds WHERE game_id = $1',
      [id]
    )
    const nextRound = parseInt(lastRound.rows[0].max_round) + 1

    const result = await app.db.query(
      `INSERT INTO game_rounds (game_id, round_number) VALUES ($1, $2) RETURNING id, round_number, created_at`,
      [id, nextRound]
    )

    const round = result.rows[0]

    app.pubsub.publish(`game:${id}`, 'game:round_added', {
      gameId: id,
      round: { id: round.id, roundNumber: round.round_number, createdAt: round.created_at }
    })

    return { round: { id: round.id, roundNumber: round.round_number, createdAt: round.created_at } }
  })

  // Upsert scores for a round
  app.put('/games/:id/rounds/:roundId/scores', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, roundId } = request.params as { id: string; roundId: string }
    const userId = request.authUser!.userId
    const { scores } = request.body as { scores: Array<{ userId: string; score: number }> }

    const gameResult = await app.db.query('SELECT created_by, status FROM games WHERE id = $1', [id])
    if (gameResult.rowCount === 0) {
      return reply.code(404).send({ error: 'Spiel nicht gefunden', statusCode: 404 })
    }
    if (gameResult.rows[0].status === 'ended') {
      return reply.code(400).send({ error: 'Spiel ist bereits beendet', statusCode: 400 })
    }

    const isCreator = gameResult.rows[0].created_by === userId

    for (const entry of scores) {
      if (!isCreator && entry.userId !== userId) {
        return reply.code(403).send({ error: 'Du kannst nur deinen eigenen Score bearbeiten', statusCode: 403 })
      }

      await app.db.query(`
        INSERT INTO game_scores (round_id, user_id, score) VALUES ($1, $2, $3)
        ON CONFLICT (round_id, user_id) DO UPDATE SET score = $3
      `, [roundId, entry.userId, entry.score])
    }

    const gameState = await buildGameState(app, (await app.db.query('SELECT * FROM games WHERE id = $1', [id])).rows[0])
    app.pubsub.publish(`game:${id}`, 'game:updated', gameState)

    return { success: true }
  })

  // Update phase completion (Phase 10 only)
  app.put('/games/:id/phases', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const userId = request.authUser!.userId
    const { userId: targetUserId, phaseNumber, completed, roundId } = request.body as {
      userId: string
      phaseNumber: number
      completed: boolean
      roundId?: string
    }

    const gameResult = await app.db.query('SELECT created_by, type, status FROM games WHERE id = $1', [id])
    if (gameResult.rowCount === 0) {
      return reply.code(404).send({ error: 'Spiel nicht gefunden', statusCode: 404 })
    }
    if (gameResult.rows[0].type !== 'phase10') {
      return reply.code(400).send({ error: 'Phasen nur für Phase 10 Spiele', statusCode: 400 })
    }
    if (gameResult.rows[0].status === 'ended') {
      return reply.code(400).send({ error: 'Spiel ist bereits beendet', statusCode: 400 })
    }

    const isCreator = gameResult.rows[0].created_by === userId
    if (!isCreator && targetUserId !== userId) {
      return reply.code(403).send({ error: 'Du kannst nur deine eigenen Phasen bearbeiten', statusCode: 403 })
    }

    await app.db.query(`
      UPDATE phase10_phases
      SET completed = $1, completed_in_round_id = $2
      WHERE game_id = $3 AND user_id = $4 AND phase_number = $5
    `, [completed, completed ? (roundId ?? null) : null, id, targetUserId, phaseNumber])

    const gameState = await buildGameState(app, (await app.db.query('SELECT * FROM games WHERE id = $1', [id])).rows[0])
    app.pubsub.publish(`game:${id}`, 'game:updated', gameState)

    return { success: true }
  })
}

async function initPhases(app: FastifyInstance, gameId: string, userId: string) {
  const values = Array.from({ length: 10 }, (_, i) => `('${gameId}', '${userId}', ${i + 1})`).join(', ')
  await app.db.query(
    `INSERT INTO phase10_phases (game_id, user_id, phase_number) VALUES ${values} ON CONFLICT DO NOTHING`
  )
}

async function buildGameState(app: FastifyInstance, game: Record<string, unknown>) {
  const gameId = game.id as string

  const playersResult = await app.db.query(`
    SELECT u.id AS user_id, u.username, u.display_name, u.avatar_path
    FROM game_players gp
    JOIN users u ON u.id = gp.user_id
    WHERE gp.game_id = $1
    ORDER BY gp.joined_at ASC
  `, [gameId])

  const roundsResult = await app.db.query(
    'SELECT id, round_number, created_at FROM game_rounds WHERE game_id = $1 ORDER BY round_number ASC',
    [gameId]
  )

  const scoresResult = await app.db.query(`
    SELECT gs.id, gs.round_id, gs.user_id, gs.score
    FROM game_scores gs
    JOIN game_rounds gr ON gr.id = gs.round_id
    WHERE gr.game_id = $1
  `, [gameId])

  let phases: Array<Record<string, unknown>> = []
  if (game.type === 'phase10') {
    const phasesResult = await app.db.query(
      'SELECT user_id, phase_number, completed, completed_in_round_id FROM phase10_phases WHERE game_id = $1',
      [gameId]
    )
    phases = phasesResult.rows
  }

  return {
    game: {
      id: game.id,
      name: game.name,
      type: game.type,
      createdBy: game.created_by,
      status: game.status,
      createdAt: game.created_at,
      endedAt: game.ended_at
    },
    players: playersResult.rows.map(r => ({
      userId: r.user_id,
      username: r.username,
      displayName: r.display_name,
      avatarPath: r.avatar_path
    })),
    rounds: roundsResult.rows.map(r => ({
      id: r.id,
      roundNumber: r.round_number,
      createdAt: r.created_at
    })),
    scores: scoresResult.rows.map(r => ({
      id: r.id,
      roundId: r.round_id,
      userId: r.user_id,
      score: r.score
    })),
    phases: phases.map(r => ({
      userId: r.user_id,
      phaseNumber: r.phase_number,
      completed: r.completed,
      completedInRoundId: r.completed_in_round_id
    }))
  }
}
