import { Link } from 'react-router-dom';
import GameCover from './GameCover.jsx';

/**
 * Картка гри (каталог, бібліотека, Wishlist): обкладинка на всю картку,
 * знизу — панель «рідкого скла» з назвою, рядком meta і діями.
 * meta — власний рядок під назвою (за замовчуванням: рік · жанри);
 * showRating — показувати середню оцінку у футері (у каталозі — так).
 */
export default function GameCard({ game, footer, index = 0, meta, showRating = true }) {
  const defaultMeta = [game.releaseYear, game.genres?.slice(0, 2).join(', ')].filter(Boolean).join(' · ');
  const href = `/games/${game.slug}`;
  return (
    <article className="game-card liquid" style={{ '--i': index }}>
      <Link to={href} className="game-card__media" tabIndex={-1} aria-hidden="true">
        <GameCover title={game.title} coverUrl={game.coverUrl} />
      </Link>
      <div className="game-card__panel">
        <Link to={href} className="game-card__title">{game.title}</Link>
        <p className="game-card__meta">{meta ?? defaultMeta}</p>
        <div className={`game-card__footer ${showRating ? '' : 'game-card__footer--actions'}`}>
          {showRating && (
            <span className="rating" title="Середня оцінка">
              ★ {game.averageRating ?? '—'}
            </span>
          )}
          {footer}
        </div>
      </div>
    </article>
  );
}
