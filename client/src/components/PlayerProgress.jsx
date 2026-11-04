import { Link } from 'react-router-dom';

// Піксельні іконки 12×12 у стилі 8-біт (# — піксель). Малюємо прямокутниками з crispEdges,
// тому при розмірі 24px кожен «піксель» = рівно 2×2 px екрана.
const PIXEL_ICONS = {
  // «!» — маркер нового квесту, як над NPC у RPG
  WANT_TO_PLAY: [
    '....####....',
    '....####....',
    '....####....',
    '....####....',
    '....####....',
    '.....##.....',
    '.....##.....',
    '............',
    '....####....',
    '....####....',
    '............',
    '............',
  ],
  PLAYING: [
    '............',
    '............',
    '.##########.',
    '############',
    '##.######.##',
    '#...####.#.#',
    '##.######.##',
    '############',
    '####....####',
    '###......###',
    '............',
    '............',
  ],
  COMPLETED: [
    '............',
    '.##########.',
    '##.######.##',
    '#..######..#',
    '##.######.##',
    '.#.######.#.',
    '...######...',
    '....####....',
    '.....##.....',
    '.....##.....',
    '...######...',
    '..########..',
  ],
  DROPPED: [
    '............',
    '...######...',
    '..########..',
    '.##########.',
    '.##..##..##.',
    '.##..##..##.',
    '.##########.',
    '..###..###..',
    '...######...',
    '...#.##.#...',
    '............',
    '............',
  ],
};

function PixelIcon({ rows }) {
  return (
    <svg width="24" height="24" viewBox="0 0 12 12" shapeRendering="crispEdges" fill="currentColor" aria-hidden="true">
      {rows.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)))}
    </svg>
  );
}

const QUESTS = [
  { value: 'WANT_TO_PLAY', label: 'Хочу пройти', hint: 'черга квестів', tone: 'want' },
  { value: 'PLAYING', label: 'Граю', hint: 'активна сесія', tone: 'playing' },
  { value: 'COMPLETED', label: 'Пройдено', hint: 'здобуті трофеї', tone: 'completed' },
  { value: 'DROPPED', label: 'Закинув', hint: 'game over', tone: 'dropped' },
];

const SEGMENTS = 20;

function SegmentBar({ ratio, label }) {
  const filled = ratio > 0 ? Math.max(1, Math.round(ratio * SEGMENTS)) : 0;
  return (
    <span className="quest__bar" role="img" aria-label={label}>
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <i key={i} className={i < filled ? 'is-on' : ''} style={{ '--d': `${i * 25}ms` }} />
      ))}
    </span>
  );
}

/** «Прогрес гравця»: розподіл бібліотеки за статусами у стилі HP/XP-барів. */
export default function PlayerProgress({ stats: s }) {
  const total = s.totalGames || 0;
  const completed = s.byStatus.COMPLETED ?? 0;
  return (
    <section className="card liquid quest-log">
      <header className="quest-log__head">
        <h2 className="section-title quest-log__title">Прогрес гравця</h2>
        <span className="quest-log__lvl" title={`Рівень = кількість пройдених ігор (${completed} з ${total})`}>LVL {completed}</span>
      </header>
      <ul className="quest-log__list">
        {QUESTS.map((q) => {
          const count = s.byStatus[q.value] ?? 0;
          return (
            <li key={q.value}>
              <Link to={`/library?status=${q.value}`} className={`quest quest--${q.tone} ${count ? '' : 'quest--empty'}`}>
                <span className="quest__icon" aria-hidden="true"><PixelIcon rows={PIXEL_ICONS[q.value]} /></span>
                <span className="quest__text">
                  <span className="quest__label">{q.label}</span>
                  <span className="quest__hint">{q.hint}</span>
                </span>
                <SegmentBar ratio={total ? count / total : 0} label={`${q.label}: ${count} з ${total}`} />
                <span className="quest__count">x{String(count).padStart(2, '0')}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
