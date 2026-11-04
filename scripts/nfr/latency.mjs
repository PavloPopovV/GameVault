// NFR-1: час відповіді API ≤ 500 мс (без «холодного старту»).
// Спершу будимо сервер (Render free засинає), потім міряємо кожен ендпоінт N разів послідовно.
import { appendFileSync, writeFileSync } from 'node:fs';

const API = (process.env.API_URL || 'https://gamevault-api-kopk.onrender.com').replace(/\/$/, '') + '/api/v1';
const RUNS = Number(process.env.RUNS || 30);
const LIMIT_MS = 500;

async function timed(path) {
  const t0 = performance.now();
  const res = await fetch(API + path);
  await res.arrayBuffer();
  return { ms: performance.now() - t0, status: res.status };
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];

const cold = await timed('/health').catch(() => ({ ms: NaN, status: 0 }));
console.log(`Перший запит (можливий холодний старт): ${cold.ms.toFixed(0)} мс, статус ${cold.status}`);
for (let i = 0; i < 3; i++) await timed('/games');

const { items } = await (await fetch(`${API}/games?limit=1&sort=title`)).json();
const slug = items[0].slug;
const term = items[0].title.split(/\s+/)[0].slice(0, 5);

const endpoints = [
  ['Пошук у каталозі (NFR-1)', `/games?q=${encodeURIComponent(term)}`],
  ['Каталог, 1-ша сторінка', '/games?limit=8'],
  ['Фільтр за жанром + сортування', '/games?genre=RPG&sort=newest&limit=8'],
  ['Сторінка гри', `/games/${slug}`],
  ['Рецензії гри', `/games/${items[0].id}/reviews`],
  ['Довідник жанрів', '/genres'],
];

const rows = [];
for (const [name, path] of endpoints) {
  const samples = [];
  for (let i = 0; i < RUNS; i++) {
    const r = await timed(path);
    if (r.status !== 200) throw new Error(`${path} → ${r.status}`);
    samples.push(r.ms);
  }
  samples.sort((a, b) => a - b);
  const row = {
    name, path,
    min: samples[0], p50: pct(samples, 50), p95: pct(samples, 95), max: samples.at(-1),
    ok: pct(samples, 95) <= LIMIT_MS,
  };
  rows.push(row);
  console.log(`${row.ok ? '✅' : '❌'} ${name}: p50 ${row.p50.toFixed(0)} мс, p95 ${row.p95.toFixed(0)} мс`);
}

const when = new Date().toISOString();
const f = (n) => n.toFixed(0);
const md = [
  `### NFR-1 — час відповіді API (${when})`,
  '',
  `Сервер: \`${API}\`, ${RUNS} послідовних запитів на ендпоінт після прогріву. Перший запит (холодний старт Render): **${f(cold.ms)} мс** — у вимогу не входить.`,
  '',
  '| Запит | min, мс | p50, мс | p95, мс | max, мс | ≤ 500 мс (p95) |',
  '| --- | ---: | ---: | ---: | ---: | :---: |',
  ...rows.map((r) => `| ${r.name} \`${r.path}\` | ${f(r.min)} | ${f(r.p50)} | ${f(r.p95)} | ${f(r.max)} | ${r.ok ? '✅' : '❌'} |`),
  '',
  'Час включає мережу від раннера GitHub Actions до Render (Франкфурт) і бази Neon, тобто це час, який бачить користувач, а не лише сервер.',
].join('\n');

writeFileSync('latency.md', md + '\n');
writeFileSync('latency.json', JSON.stringify({ when, api: API, runs: RUNS, coldStartMs: cold.ms, rows }, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n\n');
if (rows.some((r) => !r.ok)) process.exitCode = 1;
