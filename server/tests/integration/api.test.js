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
    expect((await api('post', '/auth/login').send({ email: 'grace.new@test.dev', password: 'Secret123' })).status).toBe(200);
  });
});
