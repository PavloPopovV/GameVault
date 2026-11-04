import { Link } from 'react-router-dom';
import GameCover from './GameCover.jsx';

export default function GameCard({ game, footer, index = 0 }) {
  return (
    <article className="game-card" style={{ '--i': index }}>
      <Link to={`/games/${game.slug}`} className="game-card__link">
        <GameCover title={game.title} coverUrl={game.coverUrl} />
        <div className="game-card__body">
          <h3 className="game-card__title">{game.title}</h3>
          <p className="game-card__meta">
            {[game.releaseYear, game.genres?.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}
          </p>
        </div>
      </Link>
      <div className="game-card__footer">
        <span className="rating" title="Середня оцінка">
          ★ {game.averageRating ?? '—'}
        </span>
        {footer}
      </div>
    </article>
  );
}
