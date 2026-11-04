import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../context/ToastContext.jsx';
import GameCover from '../components/GameCover.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/States.jsx';
import { STATUSES, formatDate } from '../utils/constants.js';

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const toast = useToast();
  const lib = useAsync(() => api.library(status || undefined), [status]);

  const changeStatus = async (entry, next) => {
    try {
      const updated = await api.setStatus(entry.gameId, next);
      lib.setData((list) => (status && next !== status
        ? list.filter((e) => e.id !== entry.id)
        : list.map((e) => (e.id === entry.id ? { ...e, ...updated } : e))));
      toast.success('Статус оновлено');
    } catch (err) { toast.error(err.message); }
  };

  const remove = async (entry) => {
    try {
      await api.removeFromLibrary(entry.gameId);
      lib.setData((list) => list.filter((e) => e.id !== entry.id));
      toast.success(`«${entry.game.title}» прибрано з бібліотеки`);
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <h1 className="page-title">Моя бібліотека</h1>
      <div className="chips chips--tabs" role="tablist">
        <button type="button" role="tab" aria-selected={!status} className={`chip ${!status ? 'chip--active' : ''}`} onClick={() => setParams({})}>Усі</button>
        {STATUSES.map((s) => (
          <button key={s.value} type="button" role="tab" aria-selected={status === s.value}
            className={`chip ${status === s.value ? 'chip--active' : ''}`} onClick={() => setParams({ status: s.value })}>{s.label}</button>
        ))}
      </div>

      {lib.loading && <Spinner />}
      {lib.error && <ErrorState error={lib.error} onRetry={lib.reload} />}
      {lib.data?.length === 0 && (
        <EmptyState title={status ? 'Тут поки порожньо' : 'Ваша бібліотека порожня'} text="Знайдіть гру в каталозі й додайте її в бібліотеку."
          action={<Link to="/" className="btn btn--primary">До каталогу</Link>} />
      )}
      <ul className="list">
        {lib.data?.map((e) => (
          <li key={e.id} className="list-item card">
            <Link to={`/games/${e.game.slug}`} className="list-item__cover"><GameCover title={e.game.title} coverUrl={e.game.coverUrl} size="sm" /></Link>
            <div className="list-item__info">
              <Link to={`/games/${e.game.slug}`} className="list-item__title">{e.game.title}</Link>
              <span className="muted">
                {e.game.releaseYear}
                {e.status === 'COMPLETED' && e.completedAt && ` · пройдено ${formatDate(e.completedAt)}`}
              </span>
            </div>
            <div className="list-item__actions">
              <select className={`select select--status status--${e.status.toLowerCase()}`} value={e.status}
                onChange={(ev) => changeStatus(e, ev.target.value)} aria-label={`Статус ${e.game.title}`}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => remove(e)}>Прибрати</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
