-- GV-20: рецензію можна залишити лише на гру з власної бібліотеки.
-- Міграція даних: для вже наявних рецензій без запису в бібліотеці додаємо гру в бібліотеку
-- зі статусом «Пройдено» (раз людина оцінила гру — вона в неї грала). Рецензії не видаляємо.
INSERT INTO "library_entries" ("user_id", "game_id", "status", "completed_at")
SELECT r."user_id", r."game_id", 'COMPLETED', r."created_at"
FROM "reviews" r
WHERE NOT EXISTS (
  SELECT 1 FROM "library_entries" le WHERE le."user_id" = r."user_id" AND le."game_id" = r."game_id"
);
