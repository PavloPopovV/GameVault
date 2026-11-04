import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Select from '../components/Select.jsx';
import GameCard from '../components/GameCard.jsx';
import Pagination from '../components/Pagination.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/States.jsx';
import { pluralUk } from '../utils/constants.js';

const PAGE_SIZE = 8; // карток на сторінці каталогу (2 ряди по 4)

const SORTS = [
  { value: 'rating', label: 'За рейтингом' },
  { value: 'newest', label: 'Спершу нові' },
  { value: 'title', label: 'За назвою' },
];

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [added, setAdded] = useState(() => new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = params.get('q') || '';
  const genre = params.get('genre') || '';
  const platform = params.get('platform') || '';
  const sort = params.get('sort') || 'rating';
  const page = Number(params.get('page')) || 1;

  const taxonomy = useAsync(() => Promise.all([api.genres(), api.platforms()]), []);
  const list = useAsync(() => api.games({ q, genre, platform, sort, page, limit: PAGE_SIZE }), [q, genre, platform, sort, page]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  const addToLibrary = async (game) => {
    try {
      await api.addToLibrary(game.id, 'WANT_TO_PLAY');
      setAdded((s) => new Set(s).add(game.id));
      toast.success(`«${game.title}» додано в бібліотеку`);
    } catch (err) {
      if (err.status === 409) {
        // Гра вже в бібліотеці — це не помилка, просто синхронізуємо картку
        setAdded((s) => new Set(s).add(game.id));
        toast.info(`«${game.title}» вже є у вашій бібліотеці`);
      } else {
        toast.error(err.message);
      }
    }
  };

  const [genres, platforms] = taxonomy.data ?? [[], []];
  const total = list.data?.pagination.total ?? 0;
  const hasItems = Boolean(list.data?.items.length);
  const gridKey = list.data?.items.map((g) => g.id).join('-') ?? '';

  return (
    <div className="catalog">
      <aside className={`filters card ${filtersOpen ? 'filters--open' : ''}`}>
        <div className="filters__head">
          <h2>Фільтри</h2>
          <button type="button" className="btn btn--ghost btn--sm filters__close" onClick={() => setFiltersOpen(false)}>Готово</button>
        </div>
        <fieldset className="filters__group">
          <legend>Жанр</legend>
          <label className="radio"><input type="radio" name="genre" checked={!genre} onChange={() => update({ genre: '' })} /> Усі жанри</label>
          {genres.map((g) => (
            <label key={g.id} className="radio">
              <input type="radio" name="genre" checked={genre === g.name} onChange={() => update({ genre: g.name })} /> {g.name}
            </label>
          ))}
        </fieldset>
        <fieldset className="filters__group">
          <legend>Платформа</legend>
          <label className="radio"><input type="radio" name="platform" checked={!platform} onChange={() => update({ platform: '' })} /> Усі платформи</label>
          {platforms.map((p) => (
            <label key={p.id} className="radio">
              <input type="radio" name="platform" checked={platform === p.name} onChange={() => update({ platform: p.name })} /> {p.name}
            </label>
          ))}
        </fieldset>
        <button type="button" className="btn btn--secondary btn--block" onClick={() => setParams(new URLSearchParams())}>Скинути фільтри</button>
      </aside>

      <section className="catalog__content">
        <div className="toolbar">
          <div>
            <h1 className="page-title">{q ? `Пошук: «${q}»` : 'Каталог ігор'}</h1>
            {list.data && !list.error && <p className="muted">Знайдено {total} {pluralUk(total, ['гру', 'гри', 'ігор'])}</p>}
          </div>
          <div className="toolbar__actions">
            <button type="button" className="btn btn--secondary btn--sm filters__toggle" onClick={() => setFiltersOpen(true)}>Фільтри</button>
            <Select size="sm" value={sort} options={SORTS} onChange={(v) => update({ sort: v })} label="Сортування" />
          </div>
        </div>

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
                    added.has(game.id)
                      ? <span className="badge badge--success">✓ У бібліотеці</span>
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
  );
}
