// Підтягує обкладинки з RAWG Video Games Database для ігор без обкладинки.
// Ключ: https://rawg.io/apidocs (безкоштовно) → RAWG_API_KEY у .env
// Запуск: npm run covers:rawg            — лише ігри без обкладинки
//         npm run covers:rawg -- --all   — перезаписати всі
import { eq, isNull } from 'drizzle-orm';
import { db, pool } from '../db/client.js';
import { games } from '../db/schema.js';

const KEY = process.env.RAWG_API_KEY;
const overwriteAll = process.argv.includes('--all');
// --optional: для збірки на Render — без ключа просто пропускаємо, а не падаємо
const optional = process.argv.includes('--optional');

export async function findRawgCover(title, key = KEY, fetchImpl = fetch) {
  const url = new URL('https://api.rawg.io/api/games');
  url.search = new URLSearchParams({ key, search: title, search_precise: 'true', page_size: '1' });
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`RAWG відповів ${res.status}`);
  const data = await res.json();
  return data.results?.[0]?.background_image ?? null;
}

async function main() {
  if (!KEY) {
    if (optional) {
      console.log('RAWG_API_KEY не задано — імпорт обкладинок пропущено.');
      return;
    }
    console.error('Не задано RAWG_API_KEY у .env. Отримати ключ: https://rawg.io/apidocs');
    process.exitCode = 1;
    return;
  }
  const rows = await db
    .select({ id: games.id, title: games.title })
    .from(games)
    .where(overwriteAll ? undefined : isNull(games.coverUrl));
  console.log(`Ігор для оновлення: ${rows.length}`);
  for (const game of rows) {
    try {
      const cover = await findRawgCover(game.title);
      if (cover) {
        await db.update(games).set({ coverUrl: cover }).where(eq(games.id, game.id));
        console.log(`✓ ${game.title}`);
      } else {
        console.log(`– ${game.title}: не знайдено`);
      }
    } catch (err) {
      console.log(`✗ ${game.title}: ${err.message}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().finally(() => pool.end());
}
