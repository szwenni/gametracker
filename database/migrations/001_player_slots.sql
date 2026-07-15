-- Refactor game_players to support player slots (non-joined players)
-- Add id PK, make user_id nullable, add display_name

-- 1. Create new game_players table
CREATE TABLE game_players_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  display_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Migrate existing data
INSERT INTO game_players_new (game_id, user_id, display_name, created_at)
SELECT gp.game_id, gp.user_id, u.display_name, gp.joined_at
FROM game_players gp
JOIN users u ON u.id = gp.user_id;

-- 3. Update game_scores to reference new player ids
ALTER TABLE game_scores ADD COLUMN player_id UUID;
UPDATE game_scores gs SET player_id = gpn.id
FROM game_players_new gpn, game_rounds gr
WHERE gr.id = gs.round_id
  AND gpn.game_id = gr.game_id
  AND gpn.user_id = gs.user_id;
ALTER TABLE game_scores DROP COLUMN user_id;
ALTER TABLE game_scores ALTER COLUMN player_id SET NOT NULL;
ALTER TABLE game_scores ADD CONSTRAINT fk_game_scores_player FOREIGN KEY (player_id) REFERENCES game_players_new(id) ON DELETE CASCADE;
DROP INDEX IF EXISTS idx_game_scores_round;
CREATE INDEX idx_game_scores_round ON game_scores(round_id);
ALTER TABLE game_scores DROP CONSTRAINT IF EXISTS game_scores_round_id_user_id_key;
ALTER TABLE game_scores ADD CONSTRAINT game_scores_round_id_player_id_key UNIQUE (round_id, player_id);

-- 4. Recreate phase10_phases referencing player_id
CREATE TABLE phase10_phases_new (
  player_id UUID NOT NULL REFERENCES game_players_new(id) ON DELETE CASCADE,
  phase_number INT NOT NULL CHECK (phase_number >= 1 AND phase_number <= 10),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_in_round_id UUID REFERENCES game_rounds(id) ON DELETE SET NULL,
  PRIMARY KEY (player_id, phase_number)
);

INSERT INTO phase10_phases_new (player_id, phase_number, completed, completed_in_round_id)
SELECT gpn.id, pp.phase_number, pp.completed, pp.completed_in_round_id
FROM phase10_phases pp
JOIN game_players_new gpn ON gpn.game_id = pp.game_id AND gpn.user_id = pp.user_id;

DROP TABLE phase10_phases;
ALTER TABLE phase10_phases_new RENAME TO phase10_phases;

-- 5. Update game_invitations to reference player_id
ALTER TABLE game_invitations ADD COLUMN player_id UUID;
ALTER TABLE game_invitations DROP COLUMN IF EXISTS label;
-- Existing invitations without player_id will be cleaned up
DELETE FROM game_invitations WHERE player_id IS NULL;
ALTER TABLE game_invitations ALTER COLUMN player_id SET NOT NULL;
ALTER TABLE game_invitations ADD CONSTRAINT fk_game_invitations_player FOREIGN KEY (player_id) REFERENCES game_players_new(id) ON DELETE CASCADE;

-- 6. Swap tables
DROP TABLE game_players;
ALTER TABLE game_players_new RENAME TO game_players;
CREATE INDEX idx_game_players_game ON game_players(game_id);
CREATE INDEX idx_game_players_user ON game_players(user_id);
