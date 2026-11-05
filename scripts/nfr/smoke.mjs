// ПР11: Smoke Test Suite на живому деплої — головний сценарій користувача в справжньому браузері.
// ST1 головна → ST2 реєстрація → ST3 бізнес-дія → ST4 вихід → ST5 вхід + прибирання тестового акаунта.
// Кожен запуск створює нового користувача і в кінці видаляє його (FR-10), тож прод лишається чистим.
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const WEB = (process.env.WEB_URL || 'https://gamevault-sandy-eta.vercel.app').replace(/\/$/, '');
const API = (process.env.API_URL || 'https://gamevault-api-kopk.onrender.com').replace(/\/$/, '') + '/api/v1';
const stamp = Date.now().toString(36);
const user = { username: `smoke_${stamp}`, email: `smoke_${stamp}@example.com`, password: `Smoke-${stamp}-Pass` };
const REVIEW = 'Smoke-тест: рецензія з автоматичної перевірки релізу.';

mkdirSync('shots', { recursive: true });
await fetch(`${API}/health`).catch(() => {}); // будимо Render

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
page.setDefaultTimeout(30000);
const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push(e.message));

const steps = [];
async function step(id, name, expected, fn) {
  const t0 = Date.now();
  try {
    await fn();
    steps.push({ id, name, expected, ok: true, ms: Date.now() - t0 });
    console.log(`✅ ${id} ${name}`);
  } catch (e) {
    steps.push({ id, name, expected, ok: false, ms: Date.now() - t0, error: e.message.split('\n')[0] });
    console.log(`❌ ${id} ${name}: ${e.message.split('\n')[0]}`);
  }
  await page.screenshot({ path: `shots/smoke-${id}.png` }).catch(() => {});
}
const loggedIn = () => page.locator('.nav__profile').waitFor();
let gameTitle = '';

await step('ST1', 'Головна сторінка (гість)', 'Каталог відкривається, видно картки ігор і пагінацію', async () => {
  await page.goto(WEB + '/');
  await page.getByRole('heading', { name: 'Каталог ігор' }).waitFor();
  await page.locator('.game-card').first().waitFor();
  if ((await page.locator('.game-card').count()) < 1) throw new Error('немає карток');
});

await step('ST2', 'Реєстрація нового користувача', 'Після «Створити акаунт» користувач одразу авторизований; вхід зберігається після F5', async () => {
  await page.goto(WEB + '/register');
  await page.getByLabel('Нікнейм').fill(user.username);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Пароль', { exact: true }).fill(user.password);
  await page.getByLabel('Підтвердження пароля').fill(user.password);
  await page.getByRole('button', { name: 'Створити акаунт' }).click();
  await loggedIn();
  await page.reload();
  await loggedIn();
});

await step('ST3', 'Бізнес-дія: гра в бібліотеку + рецензія', 'Гра з’являється в «Моїй бібліотеці», рецензія — на сторінці гри', async () => {
  await page.goto(WEB + '/');
  const link = page.locator('.game-card__title').first();
  gameTitle = (await link.textContent()).trim();
  await link.click();
  await page.getByRole('button', { name: '+ Додати в бібліотеку' }).first().click();
  await page.getByText('Гру додано в бібліотеку').waitFor();
  await page.getByRole('radio', { name: '8', exact: true }).click();
  await page.getByPlaceholder('Поділіться враженнями').fill(REVIEW);
  await page.getByRole('button', { name: 'Опублікувати' }).click();
  await page.locator('.review-card', { hasText: REVIEW }).waitFor();
  await page.goto(WEB + '/library');
  await page.locator('.game-card__title', { hasText: gameTitle }).waitFor();
});

await step('ST4', 'Вихід з акаунта', 'Після «Вийти з акаунту» закриті сторінки перенаправляють на /login', async () => {
  await page.goto(WEB + '/profile');
  await page.getByRole('button', { name: 'Дії з акаунтом' }).click();
  await page.getByRole('menuitem', { name: 'Вийти з акаунту' }).click();
  await page.getByRole('link', { name: 'Увійти' }).first().waitFor();
  await page.goto(WEB + '/library');
  await page.waitForURL(/\/login/);
});

await step('ST5', 'Повторний вхід і видалення тестового акаунта', 'Вхід тим самим Email/паролем; акаунт видаляється разом із бібліотекою й рецензією', async () => {
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Пароль').fill(user.password);
  await page.getByRole('button', { name: 'Увійти' }).last().click();
  await loggedIn();
  await page.goto(WEB + '/profile');
  await page.getByRole('button', { name: 'Дії з акаунтом' }).click();
  await page.getByRole('menuitem', { name: 'Видалити акаунт' }).click();
  await page.getByLabel('Введіть пароль, щоб підтвердити').fill(user.password);
  await page.getByRole('button', { name: 'Видалити назавжди' }).click();
  await page.getByRole('link', { name: 'Увійти' }).first().waitFor();
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password: user.password }),
  });
  if (res.status !== 401) throw new Error(`після видалення вхід повертає ${res.status}, очікували 401`);
});

await browser.close();

const when = new Date().toISOString();
const md = [
  `### Smoke Test Suite (${when})`,
  '',
  `Сайт: ${WEB} · тестовий користувач \`${user.username}\` (створено й видалено під час прогону)${gameTitle ? ` · гра: «${gameTitle}»` : ''}`,
  '',
  '| Крок | Сценарій | Очікуваний результат | Результат | Час |',
  '| --- | --- | --- | :---: | ---: |',
  ...steps.map((s) => `| ${s.id} | ${s.name} | ${s.expected} | ${s.ok ? '✅ Pass' : `❌ Fail — ${s.error}`} | ${(s.ms / 1000).toFixed(1)} с |`),
  '',
  jsErrors.length ? `⚠️ JS-помилки в консолі: ${jsErrors.length}` : 'JS-помилок у консолі немає.',
].join('\n');
writeFileSync('smoke.md', md + '\n');
writeFileSync('smoke.json', JSON.stringify({ when, web: WEB, user: user.username, gameTitle, steps, jsErrors }, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
if (steps.some((s) => !s.ok) || jsErrors.length) process.exitCode = 1;
