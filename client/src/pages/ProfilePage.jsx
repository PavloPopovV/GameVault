import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { STATUSES, formatDate } from '../utils/constants.js';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ username: user.username, bio: user.profile.bio ?? '' });
  const [busy, setBusy] = useState(false);
  const s = user.stats;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateMe({ username: form.username.trim(), bio: form.bio.trim() });
      await refresh();
      toast.success('Профіль оновлено');
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="profile">
      <header className="profile__head">
        <span className="avatar avatar--lg" aria-hidden="true">{user.username[0].toUpperCase()}</span>
        <div>
          <h1 className="page-title">{user.username}</h1>
          <p className="muted">{user.email} · з нами з {formatDate(user.createdAt)}</p>
        </div>
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

      <form className="card form profile__form" onSubmit={save}>
        <h2 className="section-title">Редагувати профіль</h2>
        <label className="field">
          <span className="field__label">Нікнейм</span>
          <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} pattern="[a-zA-Z0-9_]{3,32}" required />
        </label>
        <label className="field">
          <span className="field__label">Про себе</span>
          <textarea className="input textarea" rows={3} maxLength={200} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Які ігри любите?" />
          <span className="field__hint">{form.bio.length} / 200</span>
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Зберігаємо…' : 'Зберегти'}</button>
      </form>
    </div>
  );
}
