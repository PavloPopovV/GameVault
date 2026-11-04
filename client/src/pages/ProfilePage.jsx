import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import GameCover from '../components/GameCover.jsx';
import Modal from '../components/Modal.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/States.jsx';
import { STATUSES, formatDate, pluralUk } from '../utils/constants.js';

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

function MyReviews({ count }) {
  const list = useAsync(() => api.myReviews(), [count]);
  return (
    <section className="profile__reviews">
      <h2 className="section-title">Мої рецензії{list.data?.length ? <span className="muted"> · {list.data.length}</span> : null}</h2>
      {list.loading && !list.data && <Spinner />}
      {list.error && <ErrorState error={list.error} onRetry={list.reload} />}
      {list.data?.length === 0 && (
        <EmptyState title="Ще жодної рецензії" text="Оцініть гру, у яку грали, — рецензії з'являться тут."
          action={<Link to="/" className="btn btn--primary">До каталогу</Link>} />
      )}
      {list.data?.length > 0 && (
        <ul className="list">
          {list.data.map((r) => (
            <li key={r.id} className="list-item list-item--top card">
              <Link to={`/games/${r.game.slug}`} className="list-item__cover"><GameCover title={r.game.title} coverUrl={r.game.coverUrl} size="sm" /></Link>
              <div className="list-item__info">
                <div className="review-item__head">
                  <Link to={`/games/${r.game.slug}`} className="list-item__title">{r.game.title}</Link>
                  <span className="rating" aria-label={`Оцінка ${r.rating} з 10`}>★ {r.rating}<span className="muted">/10</span></span>
                </div>
                {r.text && <p className="review-item__text">{r.text}</p>}
                <span className="review-item__date">{formatDate(r.updatedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const onLogout = () => { logout(); navigate('/', { replace: true }); };
  const s = user.stats;
  const bio = user.profile.bio?.trim();

  return (
    <div className="profile">
      <header className="profile__head">
        <span className="avatar avatar--lg" aria-hidden="true">{user.username[0].toUpperCase()}</span>
        <div className="profile__info">
          <h1 className="page-title">{user.username}</h1>
          {bio ? <p className="profile__bio">{bio}</p> : <p className="profile__bio profile__bio--empty">Розкажіть, у які ігри любите грати</p>}
          <p className="profile__meta">{user.email} · з нами з {formatDate(user.createdAt)} · {s.reviewsCount} {pluralUk(s.reviewsCount, ['рецензія', 'рецензії', 'рецензій'])}</p>
          <button type="button" className="btn btn--secondary btn--sm profile__edit" onClick={() => setEditing(true)}>Редагувати профіль</button>
        </div>
        <button type="button" className="btn btn--secondary btn--sm profile__logout" onClick={onLogout}>Вийти з акаунту</button>
      </header>

      <section className="stats">
        <div className="stat card"><span className="stat__value">{s.totalGames}</span><span className="stat__label">ігор у бібліотеці</span></div>
        <div className="stat card"><span className="stat__value">{s.completionRate}%</span><span className="stat__label">пройдено</span></div>
        <div className="stat card"><span className="stat__value">{s.reviewsCount}</span><span className="stat__label">рецензій</span></div>
        <div className="stat card"><span className="stat__value">★ {s.averageGivenRating ?? '—'}</span><span className="stat__label">середня оцінка</span></div>
        <div className="stat card"><span className="stat__value">{s.wishlistCount}</span><span className="stat__label">у Wishlist</span></div>
      </section>

      <section className="card status-breakdown">
        <h2 className="section-title">За статусами</h2>
        <ul>
          {STATUSES.map((st) => (
            <li key={st.value}>
              <Link to={`/library?status=${st.value}`}>{st.label}</Link>
              <span className="status-breakdown__bar"><span style={{ width: `${s.totalGames ? (s.byStatus[st.value] / s.totalGames) * 100 : 0}%` }} className={`status--${st.value.toLowerCase()}`} /></span>
              <strong>{s.byStatus[st.value]}</strong>
            </li>
          ))}
        </ul>
      </section>

      <MyReviews count={s.reviewsCount} />

      <Modal open={editing} title="Редагувати профіль" onClose={() => setEditing(false)}>
        <EditProfileForm user={user} onDone={() => setEditing(false)} />
      </Modal>
    </div>
  );
}
