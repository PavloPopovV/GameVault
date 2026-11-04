// Наповнення БД тестовими даними: node src/db/seed.js
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db, pool } from './client.js';
import {
  users,
  profiles,
  games,
  genres,
  platforms,
  gameGenres,
  gamePlatforms,
  libraryEntries,
  wishlistItems,
  reviews,
} from './schema.js';
import { slugify } from '../utils/slug.js';

const GENRES = [
  'Action',
  'RPG',
  'Shooter',
  'Strategy',
  'Indie',
  'Adventure',
  'Simulation',
  'Roguelike',
  'Platformer',
  'Open World',
];
const PLATFORMS = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'];

const GAMES = [
  [
    'The Witcher 3: Wild Hunt',
    2015,
    'CD Projekt Red',
    ['RPG', 'Action', 'Open World'],
    ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    'Відьмак Геральт шукає свою названу доньку Цірі у світі, охопленому війною та переслідуваному Дикими Мисливцями.',
  ],
  [
    'Elden Ring',
    2022,
    'FromSoftware',
    ['RPG', 'Action', 'Open World'],
    ['PC', 'PlayStation', 'Xbox'],
    "Відкритий світ Міжзем'я, складні боси та свобода дослідження від творців Dark Souls.",
  ],
  [
    'Hades',
    2020,
    'Supergiant Games',
    ['Roguelike', 'Action', 'Indie'],
    ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    'Загрей, син Аїда, намагається втекти з підземного світу. Кожна спроба — нова комбінація дарів богів Олімпу.',
  ],
  [
    'Cyberpunk 2077',
    2020,
    'CD Projekt Red',
    ['RPG', 'Shooter', 'Open World'],
    ['PC', 'PlayStation', 'Xbox'],
    'Найманець V шукає шлях до безсмертя в мегаполісі Найт-Сіті майбутнього.',
  ],
  [
    'Stardew Valley',
    2016,
    'ConcernedApe',
    ['Simulation', 'Indie'],
    ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    'Ферма, риболовля, дружба з мешканцями містечка та спокійний ритм сільського життя.',
  ],
  [
    'Doom Eternal',
    2020,
    'id Software',
    ['Shooter', 'Action'],
    ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    'Шалений шутер, у якому Кат Рока зупиняє вторгнення пекла на Землю.',
  ],
  [
    'Hollow Knight',
    2017,
    'Team Cherry',
    ['Platformer', 'Indie', 'Action'],
    ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    'Метроїдванія про лицаря-комаху, який досліджує зруйноване королівство Халлоунест.',
  ],
  [
    'Civilization VI',
    2016,
    'Firaxis Games',
    ['Strategy'],
    ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    'Покрокова стратегія: побудуйте цивілізацію, що витримає випробування часом.',
  ],
  [
    'Red Dead Redemption 2',
    2018,
    'Rockstar Games',
    ['Action', 'Adventure', 'Open World'],
    ['PC', 'PlayStation', 'Xbox'],
    'Історія Артура Моргана та банди Ван дер Лінде на заході Америки 1899 року.',
  ],
  [
    "Baldur's Gate 3",
    2023,
    'Larian Studios',
    ['RPG', 'Strategy'],
    ['PC', 'PlayStation', 'Xbox'],
    'Рольова гра за правилами D&D з покроковими боями та величезною свободою вибору.',
  ],
  [
    'Celeste',
    2018,
    'Maddy Makes Games',
    ['Platformer', 'Indie'],
    ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    'Складний платформер про підйом на гору Селеста і боротьбу з власною тривогою.',
  ],
  [
    'Portal 2',
    2011,
    'Valve',
    ['Adventure', 'Action'],
    ['PC', 'PlayStation', 'Xbox'],
    'Головоломки з порталами, кооператив і саркастичний штучний інтелект GLaDOS.',
  ],
  [
    'Terraria',
    2011,
    'Re-Logic',
    ['Adventure', 'Indie', 'Platformer'],
    ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    'Пісочниця-виживання у 2D: копайте, будуйте, крафтіть спорядження та перемагайте босів.',
  ],
  [
    'Sekiro: Shadows Die Twice',
    2019,
    'FromSoftware',
    ['Action', 'Adventure'],
    ['PC', 'PlayStation', 'Xbox'],
    'Шінобі Вовк мститься за свого пана в Японії епохи Сенґоку; бої на мечах, де вирішує кожне парирування.',
  ],
  [
    'Disco Elysium',
    2019,
    'ZA/UM',
    ['RPG', 'Indie'],
    ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    'Детективна RPG без боїв, де головна зброя — діалоги та внутрішні голоси героя.',
  ],
  [
    'Dead Cells',
    2018,
    'Motion Twin',
    ['Roguelike', 'Platformer', 'Action'],
    ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    'Динамічний roguelite-платформер із постійно змінюваним замком.',
  ],
  [
    'XCOM 2',
    2016,
    'Firaxis Games',
    ['Strategy'],
    ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    'Тактична стратегія про опір людства інопланетним окупантам.',
  ],
  [
    'God of War Ragnarök',
    2022,
    'Santa Monica Studio',
    ['Action', 'Adventure'],
    ['PC', 'PlayStation'],
    "Кратос і Атрей протистоять наближенню Рагнарьоку в дев'яти світах скандинавської міфології.",
  ],
  [
    'S.T.A.L.K.E.R. 2: Heart of Chornobyl',
    2024,
    'GSC Game World',
    ['Shooter', 'Open World'],
    ['PC', 'Xbox'],
    'Шутер у Чорнобильській Зоні відчуження від української студії GSC Game World.',
  ],
  [
    'Factorio',
    2020,
    'Wube Software',
    ['Strategy', 'Simulation', 'Indie'],
    ['PC', 'Nintendo Switch'],
    'Будуйте та автоматизуйте фабрики на чужій планеті, оптимізуючи виробничі ланцюги.',
  ],
];

// Steam App ID для обкладинок (вертикальні 600x900 з офіційного CDN Steam).
// Для ігор поза Steam обкладинку можна підтягнути з RAWG: npm run covers:rawg
const STEAM_APP_IDS = {
  'The Witcher 3: Wild Hunt': 292030,
  'Elden Ring': 1245620,
  Hades: 1145360,
  'Cyberpunk 2077': 1091500,
  'Stardew Valley': 413150,
  'Doom Eternal': 782330,
  'Hollow Knight': 367520,
  'Civilization VI': 289070,
  'Red Dead Redemption 2': 1174180,
  "Baldur's Gate 3": 1086940,
  Celeste: 504230,
  'Portal 2': 620,
  'Disco Elysium': 632470,
  'Dead Cells': 588650,
  'XCOM 2': 268500,
  'God of War Ragnarök': 2322010,
  'S.T.A.L.K.E.R. 2: Heart of Chornobyl': 1643320,
  Factorio: 427520,
  Terraria: 105600,
  'Sekiro: Shadows Die Twice': 814380,
};
const steamCover = (appId) => `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;

async function main() {
  // --if-empty: безпечний режим для деплою — не чіпає БД, якщо дані вже є
  if (process.argv.includes('--if-empty')) {
    const [{ count }] = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(games);
    if (count > 0) {
      console.log(`Seed пропущено: у БД вже є ${count} ігор.`);
      return;
    }
  }
  console.log('Seeding…');
  await db.execute(sql`TRUNCATE ${reviews}, ${wishlistItems}, ${libraryEntries}, ${gameGenres}, ${gamePlatforms},
    ${games}, ${genres}, ${platforms}, ${profiles}, ${users} RESTART IDENTITY CASCADE`);

  const genreRows = await db
    .insert(genres)
    .values(GENRES.map((name) => ({ name })))
    .returning();
  const platformRows = await db
    .insert(platforms)
    .values(PLATFORMS.map((name) => ({ name })))
    .returning();
  const gId = Object.fromEntries(genreRows.map((g) => [g.name, g.id]));
  const pId = Object.fromEntries(platformRows.map((p) => [p.name, p.id]));

  const gameRows = await db
    .insert(games)
    .values(
      GAMES.map(([title, releaseYear, developer, , , description]) => ({
        title,
        slug: slugify(title),
        releaseYear,
        developer,
        description,
        coverUrl: STEAM_APP_IDS[title] ? steamCover(STEAM_APP_IDS[title]) : null,
      })),
    )
    .returning();
  const byTitle = Object.fromEntries(gameRows.map((g) => [g.title, g.id]));
  await db
    .insert(gameGenres)
    .values(GAMES.flatMap(([title, , , gs]) => gs.map((n) => ({ gameId: byTitle[title], genreId: gId[n] }))));
  await db
    .insert(gamePlatforms)
    .values(GAMES.flatMap(([title, , , , ps]) => ps.map((n) => ({ gameId: byTitle[title], platformId: pId[n] }))));

  // Тестові акаунти (паролі лише для локальної розробки та демо)
  const [admin, player, demo] = await db
    .insert(users)
    .values([
      {
        email: 'admin@gamevault.dev',
        username: 'admin',
        role: 'ADMIN',
        passwordHash: await bcrypt.hash('Admin12345', 10),
      },
      { email: 'player@gamevault.dev', username: 'player_one', passwordHash: await bcrypt.hash('Player12345', 10) },
      { email: 'demo@gamevault.dev', username: 'demo_gamer', passwordHash: await bcrypt.hash('Demo12345', 10) },
    ])
    .returning();
  await db.insert(profiles).values([
    { userId: admin.id, bio: 'Модератор каталогу GameVault' },
    { userId: player.id, bio: 'Люблю RPG та довгі сюжетні ігри' },
    { userId: demo.id, bio: null },
  ]);

  const now = new Date();
  await db.insert(libraryEntries).values([
    { userId: player.id, gameId: byTitle['The Witcher 3: Wild Hunt'], status: 'COMPLETED', completedAt: now },
    { userId: player.id, gameId: byTitle['Elden Ring'], status: 'PLAYING' },
    { userId: player.id, gameId: byTitle['Hades'], status: 'COMPLETED', completedAt: now },
    { userId: player.id, gameId: byTitle['Cyberpunk 2077'], status: 'DROPPED' },
    { userId: player.id, gameId: byTitle["Baldur's Gate 3"], status: 'WANT_TO_PLAY' },
    // Рецензію можна написати лише на гру з бібліотеки (GV-20)
    ...['The Witcher 3: Wild Hunt', 'Hades', 'Elden Ring', 'Hollow Knight'].map((t) => ({
      userId: demo.id, gameId: byTitle[t], status: 'COMPLETED', completedAt: now,
    })),
    { userId: admin.id, gameId: byTitle['Stardew Valley'], status: 'PLAYING' },
  ]);
  await db.insert(wishlistItems).values([
    { userId: player.id, gameId: byTitle['S.T.A.L.K.E.R. 2: Heart of Chornobyl'] },
    { userId: player.id, gameId: byTitle['God of War Ragnarök'] },
  ]);

  const R = (u, t, rating, text) => ({ userId: u.id, gameId: byTitle[t], rating, text });
  await db
    .insert(reviews)
    .values([
      R(
        player,
        'The Witcher 3: Wild Hunt',
        10,
        'Найкраща RPG, у яку я грав. Квести написані краще, ніж у багатьох серіалах.',
      ),
      R(
        demo,
        'The Witcher 3: Wild Hunt',
        9,
        'Величезний світ і чудові персонажі, хоча бойова система трохи застаріла.',
      ),
      R(player, 'Hades', 9, 'Ідеальний roguelike: кожен забіг короткий, а історія розвивається навіть після поразок.'),
      R(demo, 'Hades', 8, 'Чудова музика і стиль, але після сорока забігів трохи набридає.'),
      R(player, 'Cyberpunk 2077', 6, 'Атмосферне місто, але на старті було забагато багів, тому закинув.'),
      R(demo, 'Elden Ring', 10, 'Складно, але кожна перемога над босом відчувається як справжнє досягнення.'),
      R(admin, 'Stardew Valley', 9, 'Найзатишніша гра для вечора після роботи. Рекомендую грати з друзями.'),
      R(demo, 'Hollow Knight', 9, 'Атмосфера, музика й дизайн рівнів на рівні найкращих ігор жанру.'),
    ]);

  console.log(`Done: ${GENRES.length} genres, ${PLATFORMS.length} platforms, ${GAMES.length} games, 3 users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
