import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ActionsMenu from '../components/ActionsMenu.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import GameCover from '../components/GameCover.jsx';
import Modal from '../components/Modal.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/States.jsx';

// API віддає максимум 50 ігор за запит — для адмінки забираємо весь каталог посторінково.
async function loadAllGames() {
  const all = [];
  for (let page = 1; ; page++) {
    const { items, pagination } = await api.games({ sort: 'title', limit: 50, page });
    all.push(...items);
    if (page >= pagination.totalPages) return all;
  }
}

const EMPTY = { title: '', releaseYear: '', developer: '', coverUrl: '', description: '', genres: [], platforms: [] };

const toForm = (g) => ({
  title: g.title,
  releaseYear: g.releaseYear ?? '',
  developer: g.developer ?? '',
  coverUrl: g.coverUrl ?? '',
  description: g.description ?? '',
  genres: g.genres ?? [],
  platforms: g.platforms ?? [],
});

// Порожні необов'язкові поля → null, щоб при редагуванні їх можна було очистити.
const toBody = (f) => ({
  title: f.title.trim(),
  releaseYear: f.releaseYear === '' ? null : Number(f.releaseYear),
  developer: f.developer.trim() || null,
  coverUrl: f.coverUrl.trim() || null,
  description: f.description.trim() || null,
  genres: f.genres,
  platforms: f.platforms,
});

function validate(f) {
  const e = {};
  if (!f.title.trim()) e.title = "Назва обов'язкова";
  const y = Number(f.releaseYear);
  if (f.releaseYear !== '' && (!Number.isInteger(y) || y < 1970 || y > 2100)) e.releaseYear = 'Рік від 1970 до 2100';
  if (f.coverUrl.trim() && !/^https?:\/\/\S+$/i.test(f.coverUrl.trim())) e.coverUrl = 'Посилання має починатися з http(s)://';
  return e;
}

const FieldError = ({ errors, field }) => (errors[field] ? <span className="field__error" role="alert">{errors[field]}</span> : null);

function ChipPicker({ label, options, value, onChange }) {
  const toggle = (name) => onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  return (
    <fieldset className="field admin-form__chips">
      <legend className="field__label">{label}{value.length > 0 && <span className="admin-form__count"> · {value.length}</span>}</legend>
      <div className="filters__chips">
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value.includes(o.name)}
            className={`filter-chip ${value.includes(o.name) ? 'filter-chip--active' : ''}`} onClick={() => toggle(o.name)}>
            {o.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function GameForm({ game, taxonomy, onSaved, onCancel }) {
  const [form, setForm] = useState(game ? toForm(game) : EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (field) => (e) => { setForm({ ...form, [field]: e.target.value }); setErrors({ ...errors, [field]: undefined }); };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const saved = game ? await api.updateGame(game.id, toBody(form)) : await api.createGame(toBody(form));
      toast.success(game ? `«${saved.title}» оновлено` : `«${saved.title}» додано в каталог`);
      onSaved(saved);
    } catch (err) {
      if (err.details?.length) setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      else toast.error(err.message);
    } finally { setBusy(false); }
  };

  return (
    <form className="form admin-form" onSubmit={submit} noValidate>
      <div className="admin-form__top">
        <div className="admin-form__preview" aria-hidden="true">
          <GameCover title={form.title.trim() || 'Нова гра'} coverUrl={form.coverUrl.trim() || null} />
        </div>
        <div className="admin-form__main">
          <label className="field">
            <span className="field__label">Назва *</span>
            <input className={`input ${errors.title ? 'input--error' : ''}`} value={form.title} onChange={set('title')} maxLength={150} required />
            <FieldError errors={errors} field="title" />
          </label>
          <div className="admin-form__row">
            <label className="field">
              <span className="field__label">Рік випуску</span>
              <input type="number" inputMode="numeric" min={1970} max={2100} className={`input ${errors.releaseYear ? 'input--error' : ''}`}
                value={form.releaseYear} onChange={set('releaseYear')} />
              <FieldError errors={errors} field="releaseYear" />
            </label>
            <label className="field">
              <span className="field__label">Розробник</span>
              <input className={`input ${errors.developer ? 'input--error' : ''}`} value={form.developer} onChange={set('developer')} maxLength={100} />
              <FieldError errors={errors} field="developer" />
            </label>
          </div>
          <label className="field">
            <span className="field__label">Посилання на обкладинку</span>
            <input type="url" className={`input ${errors.coverUrl ? 'input--error' : ''}`} value={form.coverUrl} onChange={set('coverUrl')}
              placeholder="https://…/library_600x900.jpg" maxLength={500} />
            <FieldError errors={errors} field="coverUrl" />
          </label>
        </div>
      </div>

      <label className="field">
        <span className="field__label">Опис</span>
        <textarea className={`input textarea ${errors.description ? 'input--error' : ''}`} rows={4} maxLength={5000}
          value={form.description} onChange={set('description')} />
        <FieldError errors={errors} field="description" />
      </label>

      <ChipPicker label="Жанри" options={taxonomy.genres} value={form.genres} onChange={(genres) => setForm({ ...form, genres })} />
      <ChipPicker label="Платформи" options={taxonomy.platforms} value={form.platforms} onChange={(platforms) => setForm({ ...form, platforms })} />

      <div className="modal__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Скасувати</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Збереження…' : game ? 'Зберегти' : 'Додати гру'}</button>
      </div>
    </form>
  );
}

export default function AdminGamesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';
  const games = useAsync(() => (isAdmin ? loadAllGames() : Promise.resolve([])), [isAdmin]);
  const taxonomy = useAsync(async () => {
    if (!isAdmin) return { genres: [], platforms: [] };
    const [genres, platforms] = await Promise.all([api.genres(), api.platforms()]);
    return { genres, platforms };
  }, [isAdmin]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // null — закрито, 'new' — створення, обʼєкт гри — редагування
  const [removing, setRemoving] = useState(null);
  const navigate = useNavigate();

  // У списку каталогу немає опису — для форми беремо повну картку гри, інакше збереження стерло б опис.
  const openEdit = async (g) => {
    try { setEditing(await api.game(g.id)); } catch (err) { toast.error(err.message); }
  };

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = games.data ?? [];
    return needle ? list.filter((g) => g.title.toLowerCase().includes(needle) || g.developer?.toLowerCase().includes(needle)) : list;
  }, [games.data, q]);

  if (!isAdmin) {
    return <EmptyState title="Доступ лише для адміністратора" text="Ця сторінка керує каталогом ігор." action={<Link to="/" className="btn btn--primary">До каталогу</Link>} />;
  }

  const onSaved = (saved) => {
    games.setData((list) => {
      const rest = list.filter((g) => g.id !== saved.id);
      return [...rest, saved].sort((a, b) => a.title.localeCompare(b.title));
    });
    setEditing(null);
  };

  const remove = async () => {
    try {
      await api.deleteGame(removing.id);
      games.setData((list) => list.filter((g) => g.id !== removing.id));
      toast.success(`«${removing.title}» видалено з каталогу`);
    } catch (err) { toast.error(err.message); throw err; }
  };

  const loading = games.loading || taxonomy.loading;
  const error = games.error || taxonomy.error;

  return (
    <section className="admin">
      <div className="admin__head">
        <div>
          <h1 className="page-title">Керування каталогом</h1>
          <p className="page-lead muted">{games.data ? `${games.data.length} ігор у каталозі` : 'Додавайте, редагуйте й видаляйте ігри'}</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditing('new')} disabled={loading || Boolean(error)}>+ Додати гру</button>
      </div>

      <input type="search" className="input admin__search" placeholder="Пошук за назвою або розробником…" aria-label="Пошук у каталозі"
        value={q} onChange={(e) => setQ(e.target.value)} />

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={() => { games.reload(); taxonomy.reload(); }} />}
      {!loading && !error && visible.length === 0 && <EmptyState title={q ? 'Нічого не знайдено' : 'Каталог порожній'} />}

      {!loading && !error && visible.length > 0 && (
        <ul className="admin__list">
          {visible.map((g) => (
            <li key={g.id} className="admin-row liquid">
              <GameCover title={g.title} coverUrl={g.coverUrl} size="sm" />
              <div className="admin-row__info">
                <Link to={`/games/${g.slug}`} className="admin-row__title">{g.title}</Link>
                <span className="admin-row__meta">{[g.releaseYear, g.developer].filter(Boolean).join(' · ') || '—'}</span>
                <span className="admin-row__tags">{g.genres.join(', ') || 'без жанру'}</span>
              </div>
              <div className="admin-row__stats">
                <span title="Середня оцінка">★ {g.averageRating ?? '—'}</span>
                <span className="muted">{g.reviewsCount} рец.</span>
              </div>
              <ActionsMenu label={`Дії з грою ${g.title}`} items={[
                { label: 'Редагувати', onSelect: () => openEdit(g) },
                { label: 'Відкрити сторінку', onSelect: () => navigate(`/games/${g.slug}`) },
                { label: 'Видалити', danger: true, divider: true, onSelect: () => setRemoving(g) },
              ]} />
            </li>
          ))}
        </ul>
      )}

      <Modal open={editing !== null} wide title={editing === 'new' ? 'Нова гра' : 'Редагування гри'} onClose={() => setEditing(null)}>
        {editing !== null && taxonomy.data && (
          <GameForm key={editing === 'new' ? 'new' : editing.id} game={editing === 'new' ? null : editing}
            taxonomy={taxonomy.data} onSaved={onSaved} onCancel={() => setEditing(null)} />
        )}
      </Modal>

      <ConfirmDialog open={Boolean(removing)} title="Видалити гру?" danger confirmLabel="Видалити"
        onConfirm={remove} onClose={() => setRemoving(null)}>
        <b>«{removing?.title}»</b> зникне з каталогу разом з усіма рецензіями та записами в бібліотеках і wishlist користувачів. Дію не можна скасувати.
      </ConfirmDialog>
    </section>
  );
}
