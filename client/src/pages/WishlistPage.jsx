import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../context/ToastContext.jsx';
import GameCover from '../components/GameCover.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/States.jsx';
import { formatDate } from '../utils/constants.js';

export default function WishlistPage() {
  const toast = useToast();
  const wl = useAsync(() => api.wishlist(), []);

  const drop = (item) => wl.setData((list) => list.filter((x) => x.id !== item.id));
  const move = async (item) => {
    try { await api.moveToLibrary(item.gameId); drop(item); toast.success(`«${item.game.title}» перенесено в бібліотеку`); } catch (err) { toast.error(err.message); }
  };
  const remove = async (item) => {
    try { await api.removeFromWishlist(item.gameId); drop(item); toast.success('Прибрано з Wishlist'); } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <h1 className="page-title">Wishlist</h1>
      <p className="muted page-lead">Ігри, які хочете купити або спробувати.</p>
      {wl.loading && <Spinner />}
      {wl.error && <ErrorState error={wl.error} onRetry={wl.reload} />}
      {wl.data?.length === 0 && (
        <EmptyState title="Ваш Wishlist порожній" text="Натисніть «♡ У Wishlist» на сторінці гри, щоб не забути про неї."
          action={<Link to="/" className="btn btn--primary">До каталогу</Link>} />
      )}
      <ul className="list">
        {wl.data?.map((item) => (
          <li key={item.id} className="list-item card">
            <Link to={`/games/${item.game.slug}`} className="list-item__cover"><GameCover title={item.game.title} coverUrl={item.game.coverUrl} size="sm" /></Link>
            <div className="list-item__info">
              <Link to={`/games/${item.game.slug}`} className="list-item__title">{item.game.title}</Link>
              <span className="muted">додано {formatDate(item.addedAt)}</span>
            </div>
            <div className="list-item__actions">
              <button type="button" className="btn btn--primary btn--sm" onClick={() => move(item)}>→ У бібліотеку</button>
              <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => remove(item)}>Прибрати</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
