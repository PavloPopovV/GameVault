import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import GameCover from '../components/GameCover.jsx';
import ReviewForm from '../components/ReviewForm.jsx';
import ReviewCard from '../components/ReviewCard.jsx';
import Avatar from '../components/Avatar.jsx';
import Select from '../components/Select.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/States.jsx';
import { STATUSES, pluralUk } from '../utils/constants.js';

export default function GamePage() {
  const { slug } = useParams();
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const game = useAsync(() => api.game(slug), [slug, isAuthenticated]);
  const gameId = game.data?.id;
  const reviews = useAsync(() => (gameId ? api.reviews(gameId) : Promise.resolve([])), [gameId]);

  if (game.loading && !game.data) return <Spinner />;
  if (game.error) {
    return game.error.status === 404
      ? <EmptyState title="Гру не знайдено" action={<Link to="/" className="btn btn--secondary">До каталогу</Link>} />
      : <ErrorState error={game.error} onRetry={game.reload} />;
  }

  const g = game.data;
  const me = g.me;
  const myReview = reviews.data?.find((r) => r.author.id === user?.id);
  const requireLogin = () => navigate('/login', { state: { from: `/games/${slug}` } });

  const run = async (fn, success) => {
    try {
      await fn();
      if (success) toast.success(success);
      await game.reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const onStatus = (status) => run(
    () => (me?.libraryStatus ? api.setStatus(g.id, status) : api.addToLibrary(g.id, status)),
    me?.libraryStatus ? 'Статус оновлено' : 'Гру додано в бібліотеку',
  );
  const onRemove = () => {
    // Рецензія можлива лише на гру з бібліотеки, тож прибирання гри видаляє й рецензію (GV-21)
    if (me?.reviewId && !window.confirm('Разом з грою буде видалено вашу рецензію. Продовжити?')) return;
    run(async () => { await api.removeFromLibrary(g.id); if (me?.reviewId) await reviews.reload(); }, 'Гру прибрано з бібліотеки');
  };
  const onWishlist = () => (isAuthenticated
    ? run(() => (me.inWishlist ? api.removeFromWishlist(g.id) : api.addToWishlist(g.id)), me.inWishlist ? 'Прибрано з Wishlist' : 'Додано у Wishlist')
    : requireLogin());

  const afterReview = async (msg) => { toast.success(msg); await Promise.all([reviews.reload(), game.reload()]); };
  const createReview = async (body) => {
    try { await api.createReview(g.id, body); await afterReview('Рецензію опубліковано'); } catch (err) { toast.error(err.message); }
  };
  // Помилку показуємо тостом і прокидаємо далі, щоб модалка редагування не закрилась
  const updateReview = async (body) => {
    try { await api.updateReview(myReview.id, body); await afterReview('Рецензію оновлено'); } catch (err) { toast.error(err.message); throw err; }
  };
  const deleteReview = async () => {
    try { await api.deleteReview(myReview.id); await afterReview('Рецензію видалено'); } catch (err) { toast.error(err.message); throw err; }
  };

  return (
    <div className="game-page">
      <nav className="breadcrumbs"><Link to="/">Каталог</Link> / <span>{g.title}</span></nav>

      <section className="game-hero">
        <GameCover title={g.title} coverUrl={g.coverUrl} size="lg" decorative={false} />
        <div className="game-hero__info">
          <h1 className="game-hero__title">{g.title}</h1>
          <p className="muted">{[g.releaseYear, g.developer].filter(Boolean).join(' · ')}</p>
          <div className="chips">{g.genres.map((x) => <span key={x} className="chip chip--static">{x}</span>)}</div>
          <p className="game-hero__platforms"><span className="muted">Платформи:</span> {g.platforms.join(' · ')}</p>
          <div className="game-hero__rating">
            <span className="rating rating--lg">★ {g.averageRating ?? '—'}</span>
            <span className="muted">середня оцінка · {g.reviewsCount} {pluralUk(g.reviewsCount, ['рецензія', 'рецензії', 'рецензій'])}</span>
          </div>

          <div className="game-hero__actions">
            {!isAuthenticated && <button type="button" className="btn btn--primary" onClick={requireLogin}>+ Додати в бібліотеку</button>}
            {isAuthenticated && !me?.libraryStatus && (
              <button type="button" className="btn btn--primary" onClick={() => onStatus('WANT_TO_PLAY')}>+ Додати в бібліотеку</button>
            )}
            {isAuthenticated && me?.libraryStatus && (
              <>
                <Select className="select--status" value={me.libraryStatus} options={STATUSES} onChange={onStatus}
                  label="Статус гри" renderValue={(o) => `Статус: ${o.label}`} />
                <button type="button" className="btn btn--ghost" onClick={onRemove}>Прибрати з бібліотеки</button>
              </>
            )}
            <button type="button" className={`btn ${me?.inWishlist ? 'btn--secondary' : 'btn--outline'}`} onClick={onWishlist} aria-pressed={Boolean(me?.inWishlist)}>
              {me?.inWishlist ? '♥ У Wishlist' : '♡ У Wishlist'}
            </button>
          </div>

          {g.description && (
            <div className="game-hero__desc">
              <h2>Опис</h2>
              <p>{g.description}</p>
            </div>
          )}
        </div>
      </section>

      <section className="reviews">
        <h2 className="section-title">Рецензії ({g.reviewsCount})</h2>
        {!isAuthenticated && (
          <div className="card notice">
            <Link to="/login" state={{ from: `/games/${slug}` }}>Увійдіть</Link>, щоб залишити рецензію.
          </div>
        )}
        {isAuthenticated && !myReview && !reviews.loading && (me?.libraryStatus
          ? <ReviewForm onSubmit={createReview} />
          : (
            <div className="card notice notice--row">
              <span>Рецензію можна написати лише на гру з вашої бібліотеки.</span>
              <button type="button" className="btn btn--outline btn--sm" onClick={() => onStatus('WANT_TO_PLAY')}>+ Додати в бібліотеку</button>
            </div>
          ))}

        {reviews.loading && <Spinner label="Завантажуємо рецензії…" />}
        {reviews.error && <ErrorState error={reviews.error} onRetry={reviews.reload} />}
        {reviews.data && reviews.data.length === 0 && <EmptyState title="Рецензій ще немає" text="Будьте першим, хто поділиться враженнями." />}
        {reviews.data?.map((r) => {
          const mine = r.author.id === user?.id;
          return (
            <ReviewCard key={r.id} review={r} mine={mine}
              media={<Avatar name={r.author.username} avatarUrl={r.author.avatarUrl} size="lg" />}
              title={r.author.username}
              onUpdate={mine ? updateReview : undefined}
              onDelete={mine ? deleteReview : undefined} />
          );
        })}
      </section>
    </div>
  );
}
