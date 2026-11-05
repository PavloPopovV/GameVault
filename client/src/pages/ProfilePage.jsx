import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import GameCover from '../components/GameCover.jsx';
import Modal from '../components/Modal.jsx';
import ActionsMenu from '../components/ActionsMenu.jsx';
import Avatar from '../components/Avatar.jsx';
import PlayerProgress from '../components/PlayerProgress.jsx';
import ReviewCard from '../components/ReviewCard.jsx';
import { prepareAvatar } from '../utils/image.js';
import { EmptyState, ErrorState, Spinner } from '../components/States.jsx';
import { STATUSES, formatDate } from '../utils/constants.js';

const FieldError = ({ errors, field }) => (errors[field] ? <span className="field__error" role="alert">{errors[field]}</span> : null);

function EditProfileForm({ user, onDone }) {
  const { refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    username: user.username, bio: user.profile.bio ?? '', email: user.email, currentPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const emailChanged = form.email.trim().toLowerCase() !== user.email;
  const set = (field) => (e) => { setForm({ ...form, [field]: e.target.value }); setErrors({ ...errors, [field]: undefined }); };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { username: form.username.trim(), bio: form.bio.trim() };
      if (emailChanged) Object.assign(body, { email: form.email.trim(), currentPassword: form.currentPassword });
      await api.updateMe(body);
      await refresh();
      toast.success(emailChanged ? 'Профіль оновлено. Тепер входьте з новим Email' : 'Профіль оновлено');
      onDone();
    } catch (err) {
      if (err.details?.length) setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      else toast.error(err.message);
    } finally { setBusy(false); }
  };

  return (
    <form className="form" onSubmit={save} noValidate>
      <label className="field">
        <span className="field__label">Нікнейм</span>
        <input className={`input ${errors.username ? 'input--error' : ''}`} value={form.username} onChange={set('username')}
          pattern="[a-zA-Z0-9_]{3,32}" required autoComplete="username" />
        <FieldError errors={errors} field="username" />
      </label>
      <label className="field">
        <span className="field__label">Про себе</span>
        <textarea className={`input textarea ${errors.bio ? 'input--error' : ''}`} rows={3} maxLength={200} value={form.bio}
          onChange={set('bio')} placeholder="Які ігри любите?" />
        <span className="field__hint">{form.bio.length} / 200</span>
        <FieldError errors={errors} field="bio" />
      </label>
      <label className="field">
        <span className="field__label">Email (логін)</span>
        <input type="email" className={`input ${errors.email ? 'input--error' : ''}`} value={form.email} onChange={set('email')}
          required autoComplete="email" />
        <FieldError errors={errors} field="email" />
      </label>
      {emailChanged && (
        <label className="field">
          <span className="field__label">Поточний пароль</span>
          <input type="password" className={`input ${errors.currentPassword ? 'input--error' : ''}`} value={form.currentPassword}
            onChange={set('currentPassword')} autoComplete="current-password" required />
          <span className="field__hint field__hint--left">Щоб змінити Email, підтвердіть, що це ви</span>
          <FieldError errors={errors} field="currentPassword" />
        </label>
      )}
      <div className="modal__actions">
        <button type="button" className="btn btn--ghost" onClick={onDone}>Скасувати</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Зберігаємо…' : 'Зберегти'}</button>
      </div>
    </form>
  );
}

function DeleteAccountForm({ onCancel }) {
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.deleteMe(password);
      logout();
      navigate('/', { replace: true });
      toast.success('Акаунт видалено');
    } catch (err) {
      setError(err.details?.[0]?.message ?? err.message);
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <p className="modal__text">
        Буде назавжди видалено бібліотеку, Wishlist і всі ваші рецензії. Цю дію <b>не можна скасувати</b>.
      </p>
      <label className="field">
        <span className="field__label">Введіть пароль, щоб підтвердити</span>
        <input type="password" className={`input ${error ? 'input--error' : ''}`} value={password} autoComplete="current-password"
          onChange={(e) => { setPassword(e.target.value); setError(''); }} required />
        {error && <span className="field__error" role="alert">{error}</span>}
      </label>
      <div className="modal__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Скасувати</button>
        <button type="submit" className="btn btn--danger-solid" disabled={busy || !password}>{busy ? 'Видаляємо…' : 'Видалити назавжди'}</button>
      </div>
    </form>
  );
}

function AvatarPreview({ image, onDone }) {
  const { refresh } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.uploadAvatar(image);
      await refresh();
      toast.success('Фото профілю оновлено');
      onDone();
    } catch (err) { toast.error(err.message); setBusy(false); }
  };
  return (
    <div className="form">
      <div className="avatar-preview"><img src={image} alt="Попередній перегляд нового фото" /></div>
      <p className="muted avatar-preview__hint">Фото обрізано до квадрата по центру.</p>
      <div className="modal__actions">
        <button type="button" className="btn btn--ghost" onClick={onDone}>Скасувати</button>
        <button type="button" className="btn btn--primary" onClick={save} disabled={busy}>{busy ? 'Зберігаємо…' : 'Зберегти фото'}</button>
      </div>
    </div>
  );
}

// Картка статистики: фон — обкладинка тематичної гри з бібліотеки, під текстом — акцентне розмиття
function StatCard({ value, label, cover, to, scrollTo }) {
  const content = (
    <>
      {cover ? <img className="stat__bg" src={cover} alt="" aria-hidden="true" loading="lazy" /> : <span className="stat__bg stat__bg--empty" aria-hidden="true" />}
      <span className="stat__glow" aria-hidden="true" />
      <span className="stat__body">
        <span className="stat__value">{value}</span>
        <span className="stat__label">{label}</span>
      </span>
    </>
  );
  if (to) return <Link to={to} className="stat card">{content}</Link>;
  // Картки без окремої сторінки ведуть до секції на цій же сторінці (плавна прокрутка)
  const onClick = (e) => {
    e.preventDefault();
    document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return <a href={`#${scrollTo}`} className="stat card" onClick={onClick}>{content}</a>;
}

/**
 * Обирає 5 різних обкладинок: для кожної картки — перша ще не використана з її тематичних ігор,
 * а якщо таких немає — наступна незайнята з каталогу.
 */
function pickCovers(candidatesPerCard, catalog) {
  const used = new Set();
  const take = (games) => {
    const game = games.find((g) => g?.coverUrl && !used.has(g.coverUrl));
    if (game) used.add(game.coverUrl);
    return game?.coverUrl ?? null;
  };
  return candidatesPerCard.map((games) => take(games) ?? take(catalog));
}

function ProfileStats({ stats: s, reviews }) {
  // Бібліотека, Wishlist і каталог — лише заради обкладинок для фонів карток
  const lists = useAsync(
    () => Promise.all([api.library(), api.wishlist(), api.games({ limit: 20, sort: 'rating' })]),
    [s.totalGames, s.wishlistCount],
  );
  const [library = [], wishlist = [], catalog] = lists.data ?? [];
  const covers = pickCovers(
    [
      library.map((e) => e.game), // ігор у бібліотеці
      library.filter((e) => e.status === 'COMPLETED').map((e) => e.game), // пройдено
      (reviews ?? []).map((r) => r.game), // рецензій
      [...(reviews ?? [])].sort((a, b) => b.rating - a.rating).map((r) => r.game), // середня оцінка
      wishlist.map((e) => e.game), // у Wishlist
    ],
    catalog?.items ?? [],
  );
  return (
    <section className="stats">
      <StatCard value={s.totalGames} label="ігор у бібліотеці" to="/library" cover={covers[0]} />
      <StatCard value={`${s.completionRate}%`} label="пройдено" to="/library?status=COMPLETED" cover={covers[1]} />
      <StatCard value={s.reviewsCount} label="рецензій" cover={covers[2]} scrollTo="my-reviews" />
      <StatCard value={`★ ${s.averageGivenRating ?? '—'}`} label="середня оцінка" cover={covers[3]} scrollTo="my-reviews" />
      <StatCard value={s.wishlistCount} label="у Wishlist" to="/wishlist" cover={covers[4]} />
    </section>
  );
}

function MyReviews({ list }) {
  const toast = useToast();
  // Помилку показуємо тостом і прокидаємо далі, щоб модалка не закрилась
  const run = async (fn, success) => {
    try { await fn(); toast.success(success); await list.reload(); } catch (err) { toast.error(err.message); throw err; }
  };
  return (
    <section className="profile__reviews" id="my-reviews">
      <h2 className="section-title">Мої рецензії{list.data?.length ? <span className="muted"> · {list.data.length}</span> : null}</h2>
      {list.loading && !list.data && <Spinner />}
      {list.error && <ErrorState error={list.error} onRetry={list.reload} />}
      {list.data?.length === 0 && (
        <EmptyState title="Ще жодної рецензії" text="Оцініть гру, у яку грали, — рецензії з'являться тут."
          action={<Link to="/" className="btn btn--primary">До каталогу</Link>} />
      )}
      {list.data?.length > 0 && (
        <div className="reviews">
          {list.data.map((r) => (
            <ReviewCard key={r.id} review={r} clamp
              media={<Link to={`/games/${r.game.slug}`} tabIndex={-1} aria-hidden="true"><GameCover title={r.game.title} coverUrl={r.game.coverUrl} size="sm" /></Link>}
              title={<Link to={`/games/${r.game.slug}`} className="review-card__link">{r.game.title}</Link>}
              onUpdate={(body) => run(() => api.updateReview(r.id, body), 'Рецензію оновлено')}
              onDelete={() => run(() => api.deleteReview(r.id), 'Рецензію видалено')} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function ProfilePage() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);
  const [dialog, setDialog] = useState(null); // 'edit' | 'delete' | 'avatar' | null
  const [newAvatar, setNewAvatar] = useState(null);
  const pickPhoto = () => fileRef.current?.click();
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // щоб повторний вибір того самого файлу теж спрацював
    if (!file) return;
    try { setNewAvatar(await prepareAvatar(file)); setDialog('avatar'); } catch (err) { toast.error(err.message); }
  };
  const removePhoto = async () => {
    try { await api.removeAvatar(); await refresh(); toast.success('Фото профілю видалено'); } catch (err) { toast.error(err.message); }
  };
  const onLogout = () => { logout(); navigate('/', { replace: true }); };
  const closeDialog = () => setDialog(null);
  const s = user.stats;
  const reviews = useAsync(() => api.myReviews(), [s.reviewsCount]);
  const bio = user.profile.bio?.trim();

  return (
    <div className="profile">
      <header className="profile__head">
        <button type="button" className="profile__avatar" onClick={pickPhoto} aria-label={user.avatarUrl ? 'Змінити фото профілю' : 'Додати фото профілю'}>
          <Avatar name={user.username} avatarUrl={user.avatarUrl} size="lg" />
          <span className="profile__avatar-overlay" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onFile} />
        <div className="profile__info">
          <h1 className="page-title">{user.username}</h1>
          {bio ? <p className="profile__bio">{bio}</p> : <p className="profile__bio profile__bio--empty">Розкажіть, у які ігри любите грати</p>}
          {/* Email з /users/me бачить лише власник: профіль — захищена сторінка (вимога ПР7) */}
          <p className="profile__meta"><span className="profile__email">{user.email}</span> · З нами з {formatDate(user.createdAt)}</p>
        </div>
        <div className="profile__actions">
          <ActionsMenu label="Дії з акаунтом" items={[
            { label: 'Редагувати профіль', onSelect: () => setDialog('edit') },
            { label: user.avatarUrl ? 'Змінити фото' : 'Додати фото', onSelect: pickPhoto },
            ...(user.avatarUrl ? [{ label: 'Видалити фото', onSelect: removePhoto }] : []),
            { label: 'Вийти з акаунту', onSelect: onLogout },
            { label: 'Видалити акаунт', onSelect: () => setDialog('delete'), danger: true, divider: true },
          ]} />
        </div>
      </header>

      <ProfileStats stats={s} reviews={reviews.data} />

      <PlayerProgress stats={s} />

      <MyReviews list={reviews} />

      <Modal open={dialog === 'edit'} title="Редагувати профіль" onClose={closeDialog}>
        <EditProfileForm user={user} onDone={closeDialog} />
      </Modal>
      <Modal open={dialog === 'avatar' && Boolean(newAvatar)} title="Нове фото профілю" onClose={closeDialog}>
        <AvatarPreview image={newAvatar} onDone={closeDialog} />
      </Modal>
      <Modal open={dialog === 'delete'} title="Видалити акаунт?" onClose={closeDialog}>
        <DeleteAccountForm onCancel={closeDialog} />
      </Modal>
    </div>
  );
}
