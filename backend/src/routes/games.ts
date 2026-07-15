import crypto from 'node:crypto'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireAuth } from '../middleware/guards.js'

export async function gameRoutes(app: FastifyInstance) {

  // Create a new game
  app.post('/games', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest) => {
    const userId = request.authUser!.userId
    const { name, type, playerNames } = request.body as {
      name: string
      type: 'generic' | 'phase10'
      playerNames?: string[]
    }

    // Get creator display name
    const creatorResult = await app.db.query(
      'SELECT display_name FROM users WHERE id = $1', [userId]
    )
    const creatorName = creatorResult.rows[0].display_name

    const result = await app.db.query(
      `INSERT INTO games (name, type, created_by) VALUES ($1, $2, $3) RETURNING id, name, type, status, created_at`,
      [name, type ?? 'generic', userId]
    )
    const game = result.rows[0]

    // Create player slot for the creator
    const creatorSlot = await app.db.query(
      `INSERT INTO game_players (game_id, user_id, display_name) VALUES ($1, $2, $3) RETURNING id`,
      [game.id, userId, creatorName]
    )

    // For phase10, initialize phases for the creator
    if (type === 'phase10') {
      await initPhases(app, creatorSlot.rows[0].id)
    }

    // Create player slots + invite codes for other players
    if (playerNames && playerNames.length > 0) {
      for (const playerName of playerNames) {
        const playerSlot = await app.db.query(
          `INSERT INTO game_players (game_id, user_id, display_name) VALUES ($1, NULL, $2) RETURNING id`,
          [game.id, playerName]
        )

        if (type === 'phase10') {
          await initPhases(app, playerSlot.rows[0].id)
        }

        const code = crypto.randomBytes(4).toString('hex').toUpperCase()
        await app.db.query(
          `INSERT INTO game_invitations (game_id, player_id, code, created_by) VALUES ($1, $2, $3, $4)`,
          [game.id, playerSlot.rows[0].id, code, userId]
        )
      }
    }

    return { game: { ...game, createdBy: userId } }
  })

  // List games for current user (games where user is creator OR has a linked player slot)
  app.get('/games', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest) => {
    const userId = request.authUser!.userId

    const result = await app.db.query(`
      SELECT DISTINCT g.id, g.name, g.type, g.status, g.created_by, g.created_at, g.ended_at,
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

    // Allow access if user is creator OR has a player slot
    const gameResult = await app.db.query(`
      SELECT g.* FROM games g
      WHERE g.id = $1 AND (g.created_by = $2 OR EXISTS (
        SELECT 1 FROM game_players gp WHERE gp.game_id = g.id AND gp.user_id = $2
      ))
    `, [id, userId])

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

  // Join a game via invitation code (code only)
  app.post('/games/join', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.authUser!.userId
    const { code } = request.body as { code: string }

    const invite = await app.db.query(
      'SELECT id, game_id, player_id FROM game_invitations WHERE code = $1',
      [code.toUpperCase().trim()]
    )

    if (invite.rowCount === 0) {
      return reply.code(400).send({ error: 'Ungültiger Einladungscode', statusCode: 400 })
    }

    const { game_id: gameId, player_id: playerId } = invite.rows[0]

    // Check if user already has a slot in this game
    const existing = await app.db.query(
      'SELECT id FROM game_players WHERE game_id = $1 AND user_id = $2',
      [gameId, userId]
    )
    if (existing.rowCount && existing.rowCount > 0) {
      return { success: true, alreadyJoined: true, gameId }
    }

    // Get user info
    const userResult = await app.db.query(
      'SELECT display_name, avatar_path FROM users WHERE id = $1',
      [userId]
    )
    const userInfo = userResult.rows[0]

    // Link the user to the player slot and update display name
    await app.db.query(
      'UPDATE game_players SET user_id = $1, display_name = $2 WHERE id = $3',
      [userId, userInfo.display_name, playerId]
    )

    // Delete the used invitation code
    await app.db.query('DELETE FROM game_invitations WHERE id = $1', [invite.rows[0].id])

    app.pubsub.publish(`game:${gameId}`, 'game:player_joined', {
      gameId,
      playerId,
      userId,
      displayName: userInfo.display_name,
      avatarPath: userInfo.avatar_path
    })

    return { success: true, gameId }
  })

  // Generate game invitation code (creates a new player slot)
  app.post('/games/:id/invitations', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const userId = request.authUser!.userId
    const { label } = (request.body as { label: string }) || {}

    if (!label || !label.trim()) {
      return reply.code(400).send({ error: 'Spielername ist erforderlich', statusCode: 400 })
    }

    const gameResult = await app.db.query('SELECT created_by, type FROM games WHERE id = $1', [id])
    if (gameResult.rowCount === 0) {
      return reply.code(404).send({ error: 'Spiel nicht gefunden', statusCode: 404 })
    }
    if (gameResult.rows[0].created_by !== userId) {
      return reply.code(403).send({ error: 'Nur der Ersteller kann Einladungen erstellen', statusCode: 403 })
    }

    // Create the player slot
    const playerSlot = await app.db.query(
      `INSERT INTO game_players (game_id, user_id, display_name) VALUES ($1, NULL, $2) RETURNING id`,
      [id, label.trim()]
    )

    // Init phases if phase10
    if (gameResult.rows[0].type === 'phase10') {
      await initPhases(app, playerSlot.rows[0].id)
    }

    const code = crypto.randomBytes(4).toString('hex').toUpperCase()

    const result = await app.db.query(
      `INSERT INTO game_invitations (game_id, player_id, code, created_by) VALUES ($1, $2, $3, $4) RETURNING id, code, created_at`,
      [id, playerSlot.rows[0].id, code, userId]
    )

    return { invitation: { ...result.rows[0], label: label.trim() } }
  })

  // List game invitation codes (pending = not yet joined)
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

    const result = await app.db.query(`
      SELECT gi.id, gi.code, gp.display_name AS label, gi.created_at
      FROM game_invitations gi
      JOIN game_players gp ON gp.id = gi.player_id
      WHERE gi.game_id = $1
      ORDER BY gi.created_at ASC
    `, [id])

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

  // Upsert scores for a round (uses player_id)
  app.put('/games/:id/rounds/:roundId/scores', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, roundId } = request.params as { id: string; roundId: string }
    const userId = request.authUser!.userId
    const { scores } = request.body as { scores: Array<{ playerId: string; score: number }> }

    const gameResult = await app.db.query('SELECT created_by, status FROM games WHERE id = $1', [id])
    if (gameResult.rowCount === 0) {
      return reply.code(404).send({ error: 'Spiel nicht gefunden', statusCode: 404 })
    }
    if (gameResult.rows[0].status === 'ended') {
      return reply.code(400).send({ error: 'Spiel ist bereits beendet', statusCode: 400 })
    }

    const isCreator = gameResult.rows[0].created_by === userId

    // Get the current user's player slot id for permission checks
    const userSlot = await app.db.query(
      'SELECT id FROM game_players WHERE game_id = $1 AND user_id = $2',
      [id, userId]
    )
    const userPlayerId = userSlot.rows[0]?.id

    for (const entry of scores) {
      if (!isCreator && entry.playerId !== userPlayerId) {
        return reply.code(403).send({ error: 'Du kannst nur deinen eigenen Score bearbeiten', statusCode: 403 })
      }

      await app.db.query(`
        INSERT INTO game_scores (round_id, player_id, score) VALUES ($1, $2, $3)
        ON CONFLICT (round_id, player_id) DO UPDATE SET score = $3
      `, [roundId, entry.playerId, entry.score])
    }

    const gameState = await buildGameState(app, (await app.db.query('SELECT * FROM games WHERE id = $1', [id])).rows[0])
    app.pubsub.publish(`game:${id}`, 'game:updated', gameState)

    return { success: true }
  })

  // Update phase completion (Phase 10 only, uses player_id)
  app.put('/games/:id/phases', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const userId = request.authUser!.userId
    const { playerId, phaseNumber, completed, roundId } = request.body as {
      playerId: string
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
    if (!isCreator) {
      // Check if the playerId belongs to the current user
      const userSlot = await app.db.query(
        'SELECT id FROM game_players WHERE id = $1 AND user_id = $2',
        [playerId, userId]
      )
      if (userSlot.rowCount === 0) {
        return reply.code(403).send({ error: 'Du kannst nur deine eigenen Phasen bearbeiten', statusCode: 403 })
      }
    }

    await app.db.query(`
      UPDATE phase10_phases
      SET completed = $1, completed_in_round_id = $2
      WHERE player_id = $3 AND phase_number = $4
    `, [completed, completed ? (roundId ?? null) : null, playerId, phaseNumber])

    const gameState = await buildGameState(app, (await app.db.query('SELECT * FROM games WHERE id = $1', [id])).rows[0])
    app.pubsub.publish(`game:${id}`, 'game:updated', gameState)

    return { success: true }
  })
}

async function initPhases(app: FastifyInstance, playerId: string) {
  const values = Array.from({ length: 10 }, (_, i) => `('${playerId}', ${i + 1})`).join(', ')
  await app.db.query(
    `INSERT INTO phase10_phases (player_id, phase_number) VALUES ${values} ON CONFLICT DO NOTHING`
  )
}

async function buildGameState(app: FastifyInstance, game: Record<string, unknown>) {
  const gameId = game.id as string

  // Get all player slots (including those without a user)
  const playersResult = await app.db.query(`
    SELECT gp.id, gp.user_id, gp.display_name,
      u.avatar_path, u.display_name AS user_display_name
    FROM game_players gp
    LEFT JOIN users u ON u.id = gp.user_id
    WHERE gp.game_id = $1
    ORDER BY gp.created_at ASC
  `, [gameId])

  const roundsResult = await app.db.query(
    'SELECT id, round_number, created_at FROM game_rounds WHERE game_id = $1 ORDER BY round_number ASC',
    [gameId]
  )

  const scoresResult = await app.db.query(`
    SELECT gs.id, gs.round_id, gs.player_id, gs.score
    FROM game_scores gs
    JOIN game_rounds gr ON gr.id = gs.round_id
    WHERE gr.game_id = $1
  `, [gameId])

  let phases: Array<Record<string, unknown>> = []
  if (game.type === 'phase10') {
    const phasesResult = await app.db.query(`
      SELECT pp.player_id, pp.phase_number, pp.completed, pp.completed_in_round_id
      FROM phase10_phases pp
      JOIN game_players gp ON gp.id = pp.player_id
      WHERE gp.game_id = $1
    `, [gameId])
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
      id: r.id,
      userId: r.user_id,
      displayName: r.user_display_name ?? r.display_name,
      avatarPath: r.avatar_path ?? null,
      joined: r.user_id !== null
    })),
    rounds: roundsResult.rows.map(r => ({
      id: r.id,
      roundNumber: r.round_number,
      createdAt: r.created_at
    })),
    scores: scoresResult.rows.map(r => ({
      id: r.id,
      roundId: r.round_id,
      playerId: r.player_id,
      score: r.score
    })),
    phases: phases.map(r => ({
      playerId: r.player_id,
      phaseNumber: r.phase_number,
      completed: r.completed,
      completedInRoundId: r.completed_in_round_id
    }))
  }
}
