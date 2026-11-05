import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Select from '../components/Select.jsx';
import GameCard from '../components/GameCard.jsx';
import Pagination from '../components/Pagination.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/States.jsx';
import { STATUSES, pluralUk } from '../utils/constants.js';

const PAGE_SIZE = 8; // карток на сторінці каталогу (2 ряди по 4)

const SORTS = [
  { value: 'rating', label: 'За рейтингом' },
  { value: 'newest', label: 'Спершу нові' },
  { value: 'title', label: 'За назвою' },
];

// Гра вже в бібліотеці: замість кнопки — її статус, як на сторінці бібліотеки (клік веде туди)
function LibraryBadge({ status }) {
  const s = STATUSES.find((x) => x.value === status);
  // Невідомий статус (напр., новий на бекенді) — загальний бейдж замість падіння всього каталогу
  if (!s) return <Link to="/library" className="badge badge--status" title="Відкрити в бібліотеці">✓ У бібліотеці</Link>;
  return (
    <Link to={`/library?status=${status}`} className="badge badge--status" title="Відкрити в бібліотеці">
      <span className={`dot status--${s.tone}`} aria-hidden="true" />
      {s.label}
    </Link>
  );
}

// Група фільтрів: «пігулки» з вибором одного значення (radiogroup), активна — акцентна
function FilterGroup({ title, all, items, value, onChange }) {
  const options = [{ id: '', name: all }, ...items];
  return (
    <div className="filters__group">
      <span className="filters__label" id={`f-${title}`}>{title}</span>
      <div className="filters__chips" role="radiogroup" aria-labelledby={`f-${title}`}>
        {options.map((o) => {
          const active = (o.id === '' ? '' : o.name) === value;
          return (
            <button key={o.id || 'all'} type="button" role="radio" aria-checked={active}
              className={`filter-chip ${active ? 'filter-chip--active' : ''}`}
              onClick={() => onChange(o.id === '' ? '' : o.name)}>
              {o.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  // Статуси, змінені на цій сторінці (поверх libraryStatus, який приходить з API): gameId → статус
  const [localStatuses, setLocalStatuses] = useState(() => new Map());
  // Інший користувач (вихід / вхід під іншим акаунтом) — локальні статуси попереднього більше не актуальні
  useEffect(() => { setLocalStatuses(new Map()); }, [user?.id]);
  const statusOf = (game) => localStatuses.get(game.id) ?? game.libraryStatus;
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = params.get('q') || '';
  const genre = params.get('genre') || '';
  const platform = params.get('platform') || '';
  const sort = params.get('sort') || 'rating';
  const page = Number(params.get('page')) || 1;

  const taxonomy = useAsync(() => Promise.all([api.genres(), api.platforms()]), []);
  const list = useAsync(() => api.games({ q, genre, platform, sort, page, limit: PAGE_SIZE }), [q, genre, platform, sort, page, user?.id]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  const addToLibrary = async (game) => {
    try {
      await api.addToLibrary(game.id, 'WANT_TO_PLAY');
      setLocalStatuses((s) => new Map(s).set(game.id, 'WANT_TO_PLAY'));
      toast.success(`«${game.title}» додано в бібліотеку`);
    } catch (err) {
      if (err.status === 409) {
        // Гра вже в бібліотеці (напр., додана в іншій вкладці) — оновлюємо лише цю картку, без перезавантаження сітки
        toast.info(`«${game.title}» вже є у вашій бібліотеці`);
        const fresh = await api.game(game.slug).catch(() => null);
        setLocalStatuses((s) => new Map(s).set(game.id, fresh?.me?.libraryStatus ?? 'UNKNOWN'));
      } else {
        toast.error(err.message);
      }
    }
  };

  const [genres, platforms] = taxonomy.data ?? [[], []];
  const activeCount = [genre, platform].filter(Boolean).length;
  const total = list.data?.pagination.total ?? 0;
  const hasItems = Boolean(list.data?.items.length);
  const gridKey = list.data?.items.map((g) => g.id).join('-') ?? '';

  return (
    <div className="catalog-page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">{q ? `Пошук: «${q}»` : 'Каталог ігор'}</h1>
          {list.data && !list.error && <p className="muted">Знайдено {total} {pluralUk(total, ['гру', 'гри', 'ігор'])}</p>}
        </div>
        <div className="toolbar__actions">
          <button type="button" className={`btn btn--sm filters__toggle ${activeCount ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setFiltersOpen(true)}>Фільтри{activeCount > 0 && ` · ${activeCount}`}</button>
          <Select size="sm" value={sort} options={SORTS} onChange={(v) => update({ sort: v })} label="Сортування" />
        </div>
      </div>

      <div className="catalog">
        <aside className={`filters card liquid ${filtersOpen ? 'filters--open' : ''}`}>
          <div className="filters__head">
            <h2>Фільтри</h2>
            {activeCount > 0 && <span className="filters__badge">{activeCount}</span>}
            <button type="button" className="modal__close filters__close" onClick={() => setFiltersOpen(false)} aria-label="Закрити фільтри">×</button>
          </div>
          <FilterGroup title="Жанр" all="Усі жанри" items={genres} value={genre} onChange={(v) => update({ genre: v })} />
          <FilterGroup title="Платформа" all="Усі платформи" items={platforms} value={platform} onChange={(v) => update({ platform: v })} />
          <button type="button" className="btn btn--secondary btn--block filters__reset" disabled={!activeCount}
            onClick={() => setParams(new URLSearchParams())}>Скинути фільтри</button>
          {activeCount > 0 && (
            <button type="button" className="btn btn--primary btn--block filters__done" onClick={() => setFiltersOpen(false)}>Готово</button>
          )}
        </aside>

        <section className="catalog__content">
          {list.loading && !hasItems && <Spinner label="Завантажуємо ігри…" />}
          {list.error && <ErrorState error={list.error} onRetry={list.reload} />}
          {!list.loading && list.data && list.data.items.length === 0 && (
            <EmptyState title="Ігор не знайдено" text="Спробуйте змінити запит або скинути фільтри."
              action={<button type="button" className="btn btn--secondary" onClick={() => setParams(new URLSearchParams())}>Скинути фільтри</button>} />
          )}
          {hasItems && (
            <>
              {/* Старий список лишається на місці (приглушений), поки вантажиться новий — без стрибків.
                  key міняється з набором ігор, тож нові картки з'являються з анімацією. */}
              <div key={gridKey} className={`grid grid--animated ${list.loading ? 'grid--busy' : ''}`} aria-busy={list.loading}>
                {list.data.items.map((game, i) => (
                  <GameCard key={game.id} game={game} index={i} footer={
                    isAuthenticated ? (
                      statusOf(game)
                        ? <LibraryBadge status={statusOf(game)} />
                        : <button type="button" className="btn btn--outline btn--xs" onClick={() => addToLibrary(game)}>+ У бібліотеку</button>
                    ) : <Link to="/login" className="btn btn--outline btn--xs">+ У бібліотеку</Link>
                  } />
                ))}
              </div>
              <Pagination page={page} totalPages={list.data.pagination.totalPages} onChange={(p) => { update({ page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
