import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createApp } from '../../src/app.js';
import { db, pool } from '../../src/db/client.js';
import { games, genres, gameGenres } from '../../src/db/schema.js';

const app = createApp();
const api = (m, url) => request(app)[m](`/api/v1${url}`);
let gameId;

beforeAll(async () => {
  await migrate(db, { migrationsFolder: './migrations', migrationsTable: 'migrations', migrationsSchema: 'public' });
  await db.execute(sql`TRUNCATE users, games, genres, platforms RESTART IDENTITY CASCADE`);
  const [g] = await db.insert(genres).values({ name: 'RPG' }).returning();
  const [game] = await db
    .insert(games)
    .values({ title: 'Test Quest', slug: 'test-quest', releaseYear: 2024 })
    .returning();
  await db.insert(gameGenres).values({ gameId: game.id, genreId: g.id });
  gameId = game.id;
});
afterAll(() => pool.end());

async function registerUser(name) {
  const res = await api('post', '/auth/register').send({
    email: `${name}@test.dev`,
    username: name,
    password: 'Secret123',
  });
  return res.body.token;
}

describe('Auth API', () => {
  it('реєстрація → 201 + JWT; повторний Email → 409', async () => {
    const res = await api('post', '/auth/register').send({
      email: 'alice@test.dev',
      username: 'alice',
      password: 'Secret123',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    const dup = await api('post', '/auth/register').send({
      email: 'ALICE@test.dev',
      username: 'alice2',
      password: 'Secret123',
    });
    expect(dup.status).toBe(409);
    expect(dup.body.details).toEqual([{ field: 'email', message: 'Цей Email вже зайнятий' }]);
  });

  it('логін з невірним паролем → 401; з вірним → 200', async () => {
    expect((await api('post', '/auth/login').send({ email: 'alice@test.dev', password: 'wrong-pass' })).status).toBe(
      401,
    );
    expect((await api('post', '/auth/login').send({ email: 'alice@test.dev', password: 'Secret123' })).status).toBe(
      200,
    );
  });

  it('GET /users/me без токена → 401', async () => {
    expect((await api('get', '/users/me')).status).toBe(401);
  });
});

describe('Catalog + Library + Reviews API', () => {
  it('каталог доступний гостю, фільтр за жанром працює', async () => {
    const res = await api('get', '/games?genre=RPG');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].genres).toEqual(['RPG']);
    expect((await api('get', '/games?genre=Shooter')).body.items).toHaveLength(0);
  });

  it('додавання в бібліотеку, дубль 409, «Пройдено» фіксує дату', async () => {
    const token = await registerUser('bob');
    const auth = { Authorization: `Bearer ${token}` };
    expect((await api('post', '/library').set(auth).send({ gameId })).status).toBe(201);
    expect((await api('post', '/library').set(auth).send({ gameId })).status).toBe(409);
    const upd = await api('patch', `/library/${gameId}`).set(auth).send({ status: 'COMPLETED' });
    expect(upd.status).toBe(200);
    expect(upd.body.completedAt).not.toBeNull();
    const me = await api('get', '/users/me').set(auth);
    expect(me.body.stats.byStatus.COMPLETED).toBe(1);
  });

  it('GV-19: каталог повертає статус гри в бібліотеці користувача', async () => {
    const token = await registerUser('erin');
    const auth = { Authorization: `Bearer ${token}` };
    // гість і користувач без гри в бібліотеці — однаковий контракт: libraryStatus = null
    expect((await api('get', '/games')).body.items[0].libraryStatus).toBeNull();
    expect((await api('get', '/games').set(auth)).body.items[0].libraryStatus).toBeNull();
    // після додавання статус приходить у списку — стан не губиться після перезавантаження сторінки
    await api('post', '/library').set(auth).send({ gameId, status: 'PLAYING' });
    expect((await api('get', '/games').set(auth)).body.items[0].libraryStatus).toBe('PLAYING');
  });

  it('рецензія: валідація 400, створення, середня оцінка, чужа рецензія 403', async () => {
    const t1 = await registerUser('carol');
    const t2 = await registerUser('dave');
    // GV-21: рецензія лише на гру з бібліотеки — без запису в бібліотеці 403
    expect(
      (
        await api('post', `/games/${gameId}/reviews`)
          .set({ Authorization: `Bearer ${t1}` })
          .send({ rating: 8, text: 'Дуже добра тестова гра' })
      ).status,
    ).toBe(403);
    for (const t of [t1, t2])
      await api('post', '/library')
        .set({ Authorization: `Bearer ${t}` })
        .send({ gameId });
    expect(
      (
        await api('post', `/games/${gameId}/reviews`)
          .set({ Authorization: `Bearer ${t1}` })
          .send({ rating: 11, text: 'x' })
      ).status,
    ).toBe(400);
    const created = await api('post', `/games/${gameId}/reviews`)
      .set({ Authorization: `Bearer ${t1}` })
      .send({ rating: 8, text: 'Дуже добра тестова гра' });
    expect(created.status).toBe(201);
    await api('post', `/games/${gameId}/reviews`)
      .set({ Authorization: `Bearer ${t2}` })
      .send({ rating: 9, text: 'Мені теж сподобалась' });
    expect((await api('get', `/games/${gameId}`)).body.averageRating).toBe(8.5);
    expect((await api('delete', `/reviews/${created.body.id}`).set({ Authorization: `Bearer ${t2}` })).status).toBe(
      403,
    );
    expect((await api('delete', `/reviews/${created.body.id}`).set({ Authorization: `Bearer ${t1}` })).status).toBe(
      204,
    );
  });

  it('неіснуюча гра → 404, некоректний UUID → 400', async () => {
    expect((await api('get', '/games/no-such-game')).status).toBe(404);
    expect((await api('get', '/games/not-a-uuid/reviews')).status).toBe(400);
  });
});

describe('Profile API', () => {
  it('GET /users/me/reviews повертає рецензії користувача з даними гри', async () => {
    const token = await registerUser('frank');
    const auth = { Authorization: `Bearer ${token}` };
    expect((await api('get', '/users/me/reviews').set(auth)).body).toEqual([]);
    await api('post', '/library').set(auth).send({ gameId, status: 'COMPLETED' });
    await api('post', `/games/${gameId}/reviews`).set(auth).send({ rating: 7, text: 'Непогана тестова гра' });
    const res = await api('get', '/users/me/reviews').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ rating: 7, game: { id: gameId, title: 'Test Quest', slug: 'test-quest' } });
    expect((await api('get', '/users/me/reviews')).status).toBe(401);
  });

  it('зміна Email: без пароля 400, невірний пароль 400, зайнятий 409, успіх → вхід з новим Email', async () => {
    const token = await registerUser('grace');
    await registerUser('heidi');
    const auth = { Authorization: `Bearer ${token}` };
    const patch = (body) => api('patch', '/users/me').set(auth).send(body);

    expect((await patch({ email: 'new@test.dev' })).status).toBe(400);
    const wrong = await patch({ email: 'new@test.dev', currentPassword: 'WrongPass1' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.details[0].field).toBe('currentPassword');
    const taken = await patch({ email: 'heidi@test.dev', currentPassword: 'Secret123' });
    expect(taken.status).toBe(409);
    expect(taken.body.details[0].field).toBe('email');

    const ok = await patch({ email: 'Grace.New@Test.dev', currentPassword: 'Secret123' });
    expect(ok.status).toBe(200);
    expect(ok.body.email).toBe('grace.new@test.dev');
    expect((await api('post', '/auth/login').send({ email: 'grace.new@test.dev', password: 'Secret123' })).status).toBe(
      200,
    );
  });
});

describe('GV-21: рецензії й бібліотека узгоджені', () => {
  it('прибрати гру з бібліотеки → рецензія на неї теж видаляється', async () => {
    const token = await registerUser('judy');
    const auth = { Authorization: `Bearer ${token}` };
    await api('post', '/library').set(auth).send({ gameId, status: 'COMPLETED' });
    await api('post', `/games/${gameId}/reviews`).set(auth).send({ rating: 9, text: 'Пройшла і задоволена' });
    expect((await api('get', '/users/me/reviews').set(auth)).body).toHaveLength(1);
    expect((await api('delete', `/library/${gameId}`).set(auth)).status).toBe(204);
    expect((await api('get', '/users/me/reviews').set(auth)).body).toHaveLength(0);
  });
});

describe('Delete account API', () => {
  it('видалення: невірний пароль 400, успіх 204 → вхід 401, токен більше не діє', async () => {
    const token = await registerUser('ivan');
    const auth = { Authorization: `Bearer ${token}` };
    await api('post', '/library').set(auth).send({ gameId });
    const wrong = await api('delete', '/users/me').set(auth).send({ password: 'WrongPass1' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.details[0].field).toBe('password');
    expect((await api('delete', '/users/me').set(auth).send({ password: 'Secret123' })).status).toBe(204);
    expect((await api('post', '/auth/login').send({ email: 'ivan@test.dev', password: 'Secret123' })).status).toBe(401);
    expect((await api('get', '/users/me').set(auth)).status).toBe(404);
  });

  it('демо-акаунт не можна видалити або змінити йому Email → 403', async () => {
    const res = await api('post', '/auth/register').send({
      email: 'demo@gamevault.dev',
      username: 'demo_gamer',
      password: 'Demo12345',
    });
    const auth = { Authorization: `Bearer ${res.body.token}` };
    expect((await api('delete', '/users/me').set(auth).send({ password: 'Demo12345' })).status).toBe(403);
    expect(
      (await api('patch', '/users/me').set(auth).send({ email: 'x@test.dev', currentPassword: 'Demo12345' })).status,
    ).toBe(403);
  });
});

describe('Avatar API', () => {
  const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const dataUrl = `data:image/jpeg;base64,${JPEG.toString('base64')}`;

  it('завантаження → avatarUrl у профілі й рецензіях, роздача картинки, видалення', async () => {
    const token = await registerUser('kate');
    const auth = { Authorization: `Bearer ${token}` };
    expect((await api('get', '/users/me').set(auth)).body.avatarUrl).toBeNull();

    const bad = await api('put', '/users/me/avatar').set(auth).send({ image: 'data:image/png;base64,PGh0bWw+' });
    expect(bad.status).toBe(400);

    const up = await api('put', '/users/me/avatar').set(auth).send({ image: dataUrl });
    expect(up.status).toBe(200);
    const url = up.body.avatarUrl;
    expect(url).toMatch(new RegExp(`^/api/v1/users/${up.body.id}/avatar\\?v=\\d+$`));

    const img = await request(app).get(url);
    expect(img.status).toBe(200);
    expect(img.headers['content-type']).toBe('image/jpeg');
    expect(img.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(Buffer.compare(img.body, JPEG)).toBe(0);

    await api('post', '/library').set(auth).send({ gameId });
    await api('post', `/games/${gameId}/reviews`).set(auth).send({ rating: 8, text: 'Тест аватарки в рецензії' });
    const list = await api('get', `/games/${gameId}/reviews`);
    expect(list.body.find((r) => r.author.username === 'kate').author.avatarUrl).toBe(url);

    const del = await api('delete', '/users/me/avatar').set(auth);
    expect(del.body.avatarUrl).toBeNull();
    expect((await request(app).get(url)).status).toBe(404);
  });
});

describe('Review votes API', () => {
  it('👍/👎: лічильники, перемикання, зняття, гість бачить суми, за свою — 403', async () => {
    const tAuthor = await registerUser('leo');
    const tVoter = await registerUser('mia');
    const author = { Authorization: `Bearer ${tAuthor}` };
    const voter = { Authorization: `Bearer ${tVoter}` };
    await api('post', '/library').set(author).send({ gameId });
    const { body: review } = await api('post', `/games/${gameId}/reviews`)
      .set(author)
      .send({ rating: 7, text: 'Рецензія для голосів' });

    expect((await api('put', `/reviews/${review.id}/vote`).set(author).send({ value: 1 })).status).toBe(403);
    expect((await api('put', `/reviews/${review.id}/vote`).set(voter).send({ value: 5 })).status).toBe(400);
    expect((await api('put', `/reviews/${review.id}/vote`).send({ value: 1 })).status).toBe(401);

    const like = await api('put', `/reviews/${review.id}/vote`).set(voter).send({ value: 1 });
    expect(like.body).toMatchObject({ likes: 1, dislikes: 0, myVote: 1 });
    const dislike = await api('put', `/reviews/${review.id}/vote`).set(voter).send({ value: -1 });
    expect(dislike.body).toMatchObject({ likes: 0, dislikes: 1, myVote: -1 });

    const asGuest = (await api('get', `/games/${gameId}/reviews`)).body.find((r) => r.id === review.id);
    expect(asGuest).toMatchObject({ likes: 0, dislikes: 1, myVote: 0 });
    const asVoter = (await api('get', `/games/${gameId}/reviews`).set(voter)).body.find((r) => r.id === review.id);
    expect(asVoter.myVote).toBe(-1);

    const off = await api('put', `/reviews/${review.id}/vote`).set(voter).send({ value: 0 });
    expect(off.body).toMatchObject({ likes: 0, dislikes: 0, myVote: 0 });
  });
});

describe('GV-17: керування каталогом (адмін)', () => {
  it('гравцю 403; адмін створює, дубль назви 409, редагує й очищає поля, видаляє', async () => {
    const player = { Authorization: `Bearer ${await registerUser('henry')}` };
    await registerUser('ivy');
    await db.execute(sql`UPDATE users SET role = 'ADMIN' WHERE username = 'ivy'`);
    // роль зашита в JWT, тож токен адміна беремо після зміни ролі
    const login = await api('post', '/auth/login').send({ email: 'ivy@test.dev', password: 'Secret123' });
    const admin = { Authorization: `Bearer ${login.body.token}` };

    const body = { title: 'Admin Quest', releaseYear: 2025, developer: 'Studio', genres: ['RPG'] };
    expect((await api('post', '/games').set(player).send(body)).status).toBe(403);
    expect((await api('post', '/games').set(admin).send({ title: '' })).status).toBe(400);

    const created = await api('post', '/games').set(admin).send(body);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ slug: 'admin-quest', genres: ['RPG'] });

    const dup = await api('post', '/games').set(admin).send({ title: 'admin quest' });
    expect(dup.status).toBe(409);
    expect(dup.body.details).toEqual([{ field: 'title', message: 'Гра з такою назвою вже є в каталозі' }]);
    // Перейменування на назву іншої гри — теж 409; збереження власної назви — ні
    expect((await api('patch', `/games/${created.body.id}`).set(admin).send({ title: 'Test Quest' })).status).toBe(409);

    const upd = await api('patch', `/games/${created.body.id}`)
      .set(admin)
      .send({ title: 'Admin Quest', developer: null, releaseYear: null, genres: [] });
    expect(upd.status).toBe(200);
    expect(upd.body).toMatchObject({ developer: null, releaseYear: null, genres: [] });

    expect((await api('delete', `/games/${created.body.id}`).set(admin)).status).toBe(204);
    expect((await api('get', `/games/${created.body.id}`)).status).toBe(404);
  });
});

describe('GV-27: Wishlist і бібліотека не перетинаються', () => {
  it('гру з бібліотеки не можна додати у Wishlist (409); додавання в бібліотеку прибирає гру з Wishlist', async () => {
    const auth = { Authorization: `Bearer ${await registerUser('wishlist_guard')}` };
    // у Wishlist → у бібліотеку: з Wishlist гра зникає
    expect((await api('post', '/wishlist').set(auth).send({ gameId })).status).toBe(201);
    expect((await api('post', '/library').set(auth).send({ gameId, status: 'PLAYING' })).status).toBe(201);
    expect((await api('get', '/wishlist').set(auth)).body).toHaveLength(0);
    expect((await api('get', `/games/${gameId}`).set(auth)).body.me).toMatchObject({
      libraryStatus: 'PLAYING',
      inWishlist: false,
    });

    const again = await api('post', '/wishlist').set(auth).send({ gameId });
    expect(again.status).toBe(409);
    expect(again.body.message).toMatch(/бібліотеці/);
  });
});
