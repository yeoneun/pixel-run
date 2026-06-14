-- Seed initial game settings (idempotent)
INSERT INTO "game_settings" ("key", "value", "updated_at")
VALUES ('happy_ending_score', '10000', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
