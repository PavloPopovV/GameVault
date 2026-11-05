# 🎮 GameVault — особистий каталог геймера

[![CI](https://github.com/PavloPopovV/GameVault/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/PavloPopovV/GameVault/actions/workflows/ci.yml)
[![Smoke test (prod)](https://github.com/PavloPopovV/GameVault/actions/workflows/smoke.yml/badge.svg)](https://github.com/PavloPopovV/GameVault/actions/workflows/smoke.yml)
![Release](https://img.shields.io/badge/release-v1.0.0-f2600c)
![Coverage](https://img.shields.io/badge/coverage-100%25%20statements-2dd4bf)
![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white)
![Stack](https://img.shields.io/badge/stack-PERN-4169E1)

Веб-застосунок, у якому гравець веде **одну бібліотеку ігор незалежно від платформи** (PC, PlayStation, Xbox, Nintendo Switch): відзначає статус проходження, складає Wishlist, пише рецензії з оцінкою 1–10 і бачить свою статистику.

Командний проєкт з дисципліни «Проєктний практикум», група 1-ІПЗ-23, 2026.

**🌐 Живий сайт:** https://gamevault-sandy-eta.vercel.app
**🔌 API:** https://gamevault-api-kopk.onrender.com/api/v1/health

> Безкоштовний сервер на Render «засинає» після 15 хв без запитів, тож перший запит після паузи може тривати до ~50 с. Далі все працює швидко.

---

## Зміст

- [Можливості](#можливості)
- [Технології](#технології)
- [Демо-акаунти](#демо-акаунти)
- [Інструкція користувача (User Guide)](#інструкція-користувача-user-guide)
- [Розгортання локально (Deployment Instructions)](#розгортання-локально-deployment-instructions)
- [Тести](#тести)
- [Структура репозиторію](#структура-репозиторію)
- [Деплой у хмару](#деплой-у-хмару)
- [Команда](#команда)

## Можливості

| | Функція |
| --- | --- |
| 🔐 | Реєстрація і вхід за Email (JWT), ролі «Користувач» і «Адміністратор» |
| 🗂️ | Каталог ігор: пошук, фільтри за жанром і платформою, сортування, пагінація |
| 📚 | Особиста бібліотека зі статусами «Хочу пройти / Граю / Пройдено / Закинув» |
| ♡ | Wishlist з перенесенням у бібліотеку одним кліком |
| ⭐ | Рецензії з оцінкою 1–10 (лише для ігор з власної бібліотеки) і 👍 / 👎 до чужих |
| 📊 | Профіль: «Прогрес гравця», статистика, мої рецензії, фото профілю |
| 🛠️ | Адмінка: додавання, редагування й видалення ігор, модерація рецензій |
| 📱 | Адаптив від 360 px: на телефоні — нижня панель вкладок, як у мобільних застосунках |

Повний перелік змін — у [CHANGELOG.md](CHANGELOG.md).

## Технології

| Частина | Що використано |
| --- | --- |
| Frontend | React 18, Vite 5, React Router 6, SCSS (CSS-змінні-токени) |
| Backend | Node.js 22, Express, Zod (валідація), JWT, bcrypt |
| База даних | PostgreSQL 16, Drizzle ORM (SQL-міграції через drizzle-kit) |
| Тести | Vitest (unit + coverage), Supertest на реальній PostgreSQL (інтеграційні), Playwright (smoke, NFR) |
| CI / CD | GitHub Actions; хостинг — Vercel (фронтенд), Render (API), Neon (PostgreSQL) |
| Інструменти | Git Flow, ESLint + Prettier, Notion (Scrum-дошка), Figma (wireframes) |

## Демо-акаунти

Ці акаунти створює seed-скрипт. Сервер захищає їх від видалення і зміни Email, тож вони завжди доступні для перевірки.

| Роль | Email | Пароль |
| --- | --- | --- |
| Адміністратор | `admin@gamevault.dev` | `Admin12345` |
| Користувач з бібліотекою і рецензіями | `player@gamevault.dev` | `Player12345` |
| Користувач | `demo@gamevault.dev` | `Demo12345` |

## Інструкція користувача (User Guide)

Головний сценарій — від реєстрації до першої рецензії (≈ 2 хв):

1. **Зареєструйтесь.** Відкрийте [сайт](https://gamevault-sandy-eta.vercel.app) → «Увійти» → вкладка «Реєстрація». Введіть нікнейм, Email і пароль (від 8 символів) → «Створити акаунт». Вхід відбудеться автоматично.
2. **Знайдіть гру.** У каталозі введіть назву в пошук або оберіть жанр і платформу у фільтрах (на телефоні — кнопка «Фільтри»).
3. **Додайте гру в бібліотеку.** На картці або на сторінці гри натисніть «+ Додати в бібліотеку», а потім оберіть статус: «Хочу пройти», «Граю», «Пройдено» чи «Закинув». Гру, яку плануєте купити, додайте у «♡ Wishlist».
4. **Напишіть рецензію.** На сторінці гри з вашої бібліотеки поставте оцінку від 1 до 10, напишіть кілька речень і натисніть «Опублікувати». Середня оцінка гри перерахується одразу.
5. **Перегляньте свій прогрес.** У «Профілі» — статистика за статусами, рівень гравця (кількість пройдених ігор), ваші рецензії, редагування нікнейму, bio і фото. Тут же — «⋯» → «Вийти з акаунту».

Адміністратор (`admin@gamevault.dev`) бачить додатковий розділ «Адмінка»: «+ Додати гру», редагування й видалення ігор через «⋯», а на сторінках ігор — модерацію будь-яких рецензій.

## Розгортання локально (Deployment Instructions)

### 1. Вимоги

- [Node.js](https://nodejs.org) **20 або новіший** (у CI — 22) і npm
- [PostgreSQL](https://www.postgresql.org/download/) **14 або новіший** (локальний сервер) — або безкоштовна база на [Neon](https://neon.tech)
- Git

### 2. Клонування

```bash
git clone https://github.com/PavloPopovV/GameVault.git
cd GameVault
```

### 3. База даних

Створіть порожню базу (назва може бути будь-якою):

```bash
createdb gamevault
# або: psql -U postgres -c "CREATE DATABASE gamevault;"
```

### 4. Бекенд

```bash
cd server
cp .env.example .env
```

Відкрийте `server/.env` і заповніть **дві обов'язкові змінні**, решту можна лишити як є:

| Змінна | Що вписати |
| --- | --- |
| `DATABASE_URL` | рядок підключення до бази з кроку 3, наприклад `postgresql://postgres:пароль@localhost:5432/gamevault` |
| `JWT_SECRET` | будь-який довгий випадковий рядок (32+ символи) |

Далі встановіть залежності, створіть таблиці й заповніть базу демо-даними:

```bash
npm install
npm run db:migrate   # створює 11 таблиць (міграції з server/migrations)
npm run db:seed      # 20 ігор, жанри, платформи, 3 демо-акаунти
npm run dev          # API на http://localhost:4000/api/v1
```

У консолі має з'явитись `Database connected successfully`. Перевірка: відкрийте http://localhost:4000/api/v1/health — відповідь `{"status":"ok"}`.

> ⚠️ `npm run db:seed` очищає таблиці перед заповненням. Не запускайте його на базі з даними, які треба зберегти.

### 5. Фронтенд

У **новому вікні терміналу** з кореня репозиторію:

```bash
cd client
npm install
npm run dev          # http://localhost:5173
```

Файл `client/.env` для локального запуску не потрібен: Vite сам проксує `/api` на `localhost:4000`. Відкрийте http://localhost:5173 і увійдіть одним із [демо-акаунтів](#демо-акаунти).

> Хочете подивитись лише фронтенд, без локального бекенду й бази? Замість `npm run dev` виконайте `npm run dev:live` — фронтенд працюватиме з живим API на Render.

### Якщо щось не працює

| Симптом | Причина і рішення |
| --- | --- |
| `Database connection failed` при старті API | PostgreSQL не запущений або в `DATABASE_URL` неправильні логін, пароль, порт чи назва бази |
| `relation "games" does not exist` | не виконано `npm run db:migrate` |
| Каталог порожній | не виконано `npm run db:seed` |
| На сайті «Немає з'єднання з сервером» | бекенд не запущений (крок 4) або він працює не на порту 4000 |
| Помилка CORS у консолі браузера | `CLIENT_URL` у `server/.env` не збігається з адресою фронтенду (за замовчуванням `http://localhost:5173`) |

## Тести

```bash
cd server
npm test                 # 87 unit-тестів бізнес-логіки
npm run test:coverage    # те саме + звіт покриття (поріг 80%, зараз 100% statements)
npm run lint             # ESLint, 0 warnings
```

Інтеграційні тести працюють на **окремій** базі, бо очищають її перед кожним запуском:

```bash
createdb gamevault_test
# у server/.env: TEST_DATABASE_URL="postgresql://postgres:пароль@localhost:5432/gamevault_test"
npm run test:integration # 17 сценаріїв через HTTP на реальній PostgreSQL
```

У CI (GitHub Actions) лінтер, unit- та інтеграційні тести й збірка фронтенду запускаються на кожен Pull Request. Заміри продуктивності й адаптивності (NFR) та Smoke Test Suite на живому сайті — окремими workflow: «NFR checks (prod)» і «Smoke test (prod)».

## Структура репозиторію

```
GameVault/
├── client/                 # React + Vite
│   └── src/
│       ├── api/            # HTTP-клієнт (JWT, помилки, мережа)
│       ├── components/     # Модалки, меню «⋯», картки, нижня панель вкладок
│       ├── context/        # Авторизація, toast-сповіщення
│       ├── pages/          # Каталог, гра, бібліотека, Wishlist, профіль, адмінка, вхід
│       └── styles/         # SCSS, токени кольорів і розмірів
├── server/                 # Node.js + Express
│   ├── migrations/         # SQL-міграції Drizzle (0000–0006)
│   ├── src/
│   │   ├── db/             # Схема (schema.js), підключення, seed
│   │   ├── domain/         # Чиста бізнес-логіка — покрита unit-тестами
│   │   ├── middleware/     # JWT, ролі, валідація, обробник помилок
│   │   ├── routes/         # REST API /api/v1 + Zod-схеми
│   │   └── services/       # Робота з БД
│   └── tests/              # unit/ та integration/
├── scripts/nfr/            # Playwright: Smoke Test Suite, заміри NFR-1 / NFR-3
├── docs/diagrams/          # Use Case, Class, ER (PlantUML, PNG, DBML)
├── render.yaml             # Render Blueprint для API
└── CHANGELOG.md
```

## Деплой у хмару

Прод деплоїться автоматично з гілки `main` (Git Flow: `feature/*` → `develop` → `release/*` → `main`).

| Сервіс | Налаштування |
| --- | --- |
| **Neon** (PostgreSQL) | створити проєкт, скопіювати рядок підключення |
| **Render** (API) | New → Blueprint → цей репозиторій (`render.yaml`). Ввести `DATABASE_URL` з Neon і `CLIENT_URL` = адреса фронтенду на Vercel. `JWT_SECRET` Render згенерує сам. Міграції і seed (лише якщо база порожня) виконуються під час кожного деплою |
| **Vercel** (фронтенд) | Import Project → Root Directory `client` → змінна `VITE_API_URL` = адреса API на Render. Production Branch — `main` |

Секрети зберігаються лише у змінних середовища хостингу і ніколи не потрапляють у репозиторій. Шаблони змінних — `server/.env.example` і `client/.env.example`.

## Команда

| Учасник | Роль | Зона відповідальності |
| --- | --- | --- |
| Попов П. ([@PavloPopovV](https://github.com/PavloPopovV)) | Tech Lead / Full-stack Developer | архітектура, бекенд, БД, фронтенд, деплой, Code Review |
| Троць М. | Product Owner | бачення продукту, User Stories, пріоритети беклогу (MoSCoW) |
| Дерефінка Я. | Scrum Master | Scrum-дошка, спринти, Daily, ретроспективи |
| Білаш Д. | UI/UX Designer + Frontend Developer | wireframes у Figma, інтерфейс |
| Кость Д. | QA Engineer | тест-кейси, баг-репорти, Smoke Test Suite, coverage |
| Семенович О. | Technical Writer | README, User Guide, документація |

Таск-менеджер і звіти з практичних робіт — у Notion. Комунікація команди — Telegram.
