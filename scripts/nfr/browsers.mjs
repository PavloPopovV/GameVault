// NFR-3: інтерфейс без горизонтальної прокрутки від 360 до 1920 px;
// Chrome, Edge (Chromium), Firefox, Safari (рушій WebKit). Перевіряємо живий продакшн.
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const WEB = (process.env.WEB_URL || 'https://gamevault-sandy-eta.vercel.app').replace(/\/$/, '');
const API = (process.env.API_URL || 'https://gamevault-api-kopk.onrender.com').replace(/\/$/, '') + '/api/v1';
const VIEWPORTS = [[360, 740], [768, 1024], [1280, 800], [1920, 1080]];

// Демо-акаунти публічні (README) — потрібні, щоб перевірити закриті сторінки.
async function token(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login ${email} → ${res.status}`);
  return (await res.json()).token;
}

await fetch(`${API}/health`); // будимо Render
const [{ items }, player, admin] = await Promise.all([
  fetch(`${API}/games?limit=1&sort=rating`).then((r) => r.json()),
  token('player@gamevault.dev', 'Player12345'),
  token('admin@gamevault.dev', 'Admin12345'),
]);

const PAGES = [
  { name: 'Каталог', path: '/', ready: '.game-card' },
  { name: 'Гра', path: `/games/${items[0].slug}`, ready: 'h1' },
  { name: 'Вхід', path: '/login', ready: 'form' },
  { name: 'Бібліотека', path: '/library', ready: 'h1', token: player },
  { name: 'Профіль', path: '/profile', ready: 'h1', token: player },
  { name: 'Адмінка', path: '/admin/games', ready: '.admin-row', token: admin },
];

const BROWSERS = [
  { name: 'Chrome', type: chromium, opts: { channel: 'chrome' } },
  { name: 'Edge', type: chromium, opts: { channel: 'msedge' } },
  { name: 'Firefox', type: firefox, opts: {} },
  { name: 'Safari (WebKit)', type: webkit, opts: {} },
];

mkdirSync('shots', { recursive: true });
const results = [];

for (const b of BROWSERS) {
  let browser;
  try {
    browser = await b.type.launch(b.opts);
  } catch (e) {
    console.log(`⚠️ ${b.name} не запустився: ${e.message.split('\n')[0]}`);
    results.push({ browser: b.name, skipped: true });
    continue;
  }
  const version = browser.version();
  for (const [width, height] of VIEWPORTS) {
    const row = { browser: b.name, version, width, cells: [] };
    for (const p of PAGES) {
      const ctx = await browser.newContext({ viewport: { width, height } });
      if (p.token) await ctx.addInitScript((t) => localStorage.setItem('gv_token', t), p.token);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      let cell;
      try {
        await page.goto(WEB + p.path, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForSelector(p.ready, { timeout: 30000 });
        await page.waitForTimeout(800);
        const m = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
          crashed: Boolean(document.querySelector('.state--error')),
        }));
        const overflow = m.scroll - m.client;
        // Помилки завантаження сторонніх картинок не рахуємо — у них є заглушка
        const jsErrors = errors.filter((e) => !/Failed to load resource/i.test(e));
        cell = { page: p.name, ok: overflow <= 1 && !m.crashed && jsErrors.length === 0, overflow, crashed: m.crashed, errors: jsErrors };
        if (b.name === 'Chrome' || width === 360) {
          await page.screenshot({ path: `shots/${b.name.split(' ')[0].toLowerCase()}-${width}-${p.name}.png`, fullPage: width === 360 });
        }
      } catch (e) {
        cell = { page: p.name, ok: false, error: e.message.split('\n')[0] };
      }
      row.cells.push(cell);
      console.log(`${cell.ok ? '✅' : '❌'} ${b.name} ${width}px ${p.name}${cell.ok ? '' : ` — ${JSON.stringify(cell)}`}`);
      await ctx.close();
    }
    results.push(row);
  }
  await browser.close();
}

const when = new Date().toISOString();
const md = [
  `### NFR-3 — адаптивність і браузери (${when})`,
  '',
  `Сайт: ${WEB}. ✅ = сторінка завантажилась, немає горизонтальної прокрутки (scrollWidth ≤ clientWidth), немає екрана помилки і JS-помилок у консолі.`,
  '',
  `| Браузер | Ширина | ${PAGES.map((p) => p.name).join(' | ')} |`,
  `| --- | ---: | ${PAGES.map(() => ':---:').join(' | ')} |`,
  ...results.map((r) => (r.skipped
    ? `| ${r.browser} | — | ${PAGES.map(() => 'не запустився').join(' | ')} |`
    : `| ${r.browser} ${r.version} | ${r.width} px | ${r.cells.map((c) => (c.ok ? '✅' : `❌${c.overflow > 1 ? ` +${c.overflow}px` : ''}`)).join(' | ')} |`)),
  '',
  'Safari перевірено рушієм WebKit від Playwright (той самий рушій, що в Safari), не самим Safari на macOS.',
].join('\n');

writeFileSync('browsers.md', md + '\n');
writeFileSync('browsers.json', JSON.stringify({ when, web: WEB, results }, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n\n');
if (results.some((r) => !r.skipped && r.cells.some((c) => !c.ok))) process.exitCode = 1;
