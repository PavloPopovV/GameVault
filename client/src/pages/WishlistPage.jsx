import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../context/ToastContext.jsx';
import GameCard from '../components/GameCard.jsx';
import IconButton from '../components/IconButton.jsx';
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
      {wl.data?.length > 0 && (
        <div className="grid">
          {wl.data.map((item, i) => (
            <GameCard key={item.id} game={item.game} index={i} showRating={false}
              meta={`додано ${formatDate(item.addedAt)}`}
              footer={(
                <>
                  <button type="button" className="btn btn--primary btn--xs game-card__main-action" onClick={() => move(item)}>→ У бібліотеку</button>
                  <IconButton icon="trash" label={`Прибрати «${item.game.title}» з Wishlist`} onClick={() => remove(item)} danger />
                </>
              )} />
          ))}
        </div>
      )}
    </div>
  );
}
