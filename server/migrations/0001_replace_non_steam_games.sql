-- Міграція даних: замінюємо дві гри без сторінки в Steam (і без обкладинки)
-- на Terraria та Sekiro. На чистій БД нічого не змінює — seed одразу додасть нові ігри.
UPDATE "games" SET
  "title" = 'Terraria',
  "slug" = 'terraria',
  "release_year" = 2011,
  "developer" = 'Re-Logic',
  "description" = 'Пісочниця-виживання у 2D: копайте, будуйте, крафтіть спорядження та перемагайте босів.',
  "cover_url" = 'https://cdn.akamai.steamstatic.com/steam/apps/105600/library_600x900.jpg'
WHERE "slug" = 'minecraft';
--> statement-breakpoint
UPDATE "games" SET
  "title" = 'Sekiro: Shadows Die Twice',
  "slug" = 'sekiro-shadows-die-twice',
  "release_year" = 2019,
  "developer" = 'FromSoftware',
  "description" = 'Шінобі Вовк мститься за свого пана в Японії епохи Сенґоку; бої на мечах, де вирішує кожне парирування.',
  "cover_url" = 'https://cdn.akamai.steamstatic.com/steam/apps/814380/library_600x900.jpg'
WHERE "slug" = 'the-legend-of-zelda-tears-of-the-kingdom';
--> statement-breakpoint
DELETE FROM "game_genres" WHERE "game_id" IN (SELECT "id" FROM "games" WHERE "slug" IN ('terraria', 'sekiro-shadows-die-twice'));
--> statement-breakpoint
DELETE FROM "game_platforms" WHERE "game_id" IN (SELECT "id" FROM "games" WHERE "slug" IN ('terraria', 'sekiro-shadows-die-twice'));
--> statement-breakpoint
INSERT INTO "game_genres" ("game_id", "genre_id")
SELECT g."id", ge."id" FROM "games" g JOIN "genres" ge ON
  (g."slug" = 'terraria' AND ge."name" IN ('Adventure', 'Indie', 'Platformer'))
  OR (g."slug" = 'sekiro-shadows-die-twice' AND ge."name" IN ('Action', 'Adventure'))
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "game_platforms" ("game_id", "platform_id")
SELECT g."id", p."id" FROM "games" g JOIN "platforms" p ON
  (g."slug" = 'terraria' AND p."name" IN ('PC', 'PlayStation', 'Xbox', 'Nintendo Switch'))
  OR (g."slug" = 'sekiro-shadows-die-twice' AND p."name" IN ('PC', 'PlayStation', 'Xbox'))
ON CONFLICT DO NOTHING;
