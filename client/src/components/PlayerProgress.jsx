import { Link } from 'react-router-dom';

// Іконки — з набору Lucide (ISC)
const ICONS = {
  WANT_TO_PLAY: <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  PLAYING: (
    <>
      <line x1="6" x2="10" y1="11" y2="11" /><line x1="8" x2="8" y1="9" y2="13" />
      <line x1="15" x2="15.01" y1="12" y2="12" /><line x1="18" x2="18.01" y1="10" y2="10" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z" />
    </>
  ),
  COMPLETED: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  ),
  DROPPED: (
    <>
      <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><path d="M8 20v2h8v-2" />
      <path d="m12.5 17-.5-1-.5 1h1z" /><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
    </>
  ),
};

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
    <section className="card quest-log">
      <header className="quest-log__head">
        <div>
          <span className="quest-log__kicker">PLAYER STATS</span>
          <h2 className="section-title quest-log__title">Прогрес гравця</h2>
        </div>
        <div className="quest-log__level" title="Рівень = кількість пройдених ігор">
          <span className="quest-log__lvl">LVL {completed}</span>
          <span className="quest-log__xp">{completed} / {total} пройдено</span>
        </div>
      </header>
      <ul className="quest-log__list">
        {QUESTS.map((q) => {
          const count = s.byStatus[q.value] ?? 0;
          return (
            <li key={q.value}>
              <Link to={`/library?status=${q.value}`} className={`quest quest--${q.tone} ${count ? '' : 'quest--empty'}`}>
                <span className="quest__icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONS[q.value]}</svg>
                </span>
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
