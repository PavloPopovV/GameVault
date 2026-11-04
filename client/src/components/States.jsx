export function Spinner({ label = 'Завантаження…' }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="state__text">{label}</span>
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="state state--empty">
      <div className="state__icon" aria-hidden="true">🎮</div>
      <h3 className="state__title">{title}</h3>
      {text && <p className="state__text">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <div className="state__icon" aria-hidden="true">⚠️</div>
      <h3 className="state__title">Не вдалося завантажити дані</h3>
      <p className="state__text">{error?.message}</p>
      {onRetry && <button type="button" className="btn btn--secondary" onClick={onRetry}>Спробувати ще раз</button>}
    </div>
  );
}
