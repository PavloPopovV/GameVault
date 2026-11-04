import { Link } from 'react-router-dom';
import GameCover from './GameCover.jsx';

/**
 * Картка гри (каталог, бібліотека, Wishlist).
 * meta — власний рядок під назвою (за замовчуванням: рік · жанри);
 * showRating — показувати середню оцінку у футері (у каталозі — так).
 */
export default function GameCard({ game, footer, index = 0, meta, showRating = true }) {
  const defaultMeta = [game.releaseYear, game.genres?.slice(0, 2).join(', ')].filter(Boolean).join(' · ');
  return (
    <article className="game-card liquid" style={{ '--i': index }}>
      <Link to={`/games/${game.slug}`} className="game-card__link">
        <GameCover title={game.title} coverUrl={game.coverUrl} />
        <div className="game-card__body">
          <h3 className="game-card__title">{game.title}</h3>
          <p className="game-card__meta">{meta ?? defaultMeta}</p>
        </div>
      </Link>
      <div className={`game-card__footer ${showRating ? '' : 'game-card__footer--actions'}`}>
        {showRating && (
          <span className="rating" title="Середня оцінка">
            ★ {game.averageRating ?? '—'}
          </span>
        )}
        {footer}
      </div>
    </article>
  );
}
