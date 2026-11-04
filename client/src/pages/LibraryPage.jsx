import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import GameCard from '../components/GameCard.jsx';
import IconButton from '../components/IconButton.jsx';
import Select from '../components/Select.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/States.jsx';
import { STATUSES, formatDate } from '../utils/constants.js';

const ChipCount = ({ value }) => (value ? <span className="chip__count">{value}</span> : null);

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const toast = useToast();
  const stats = useAuth().user?.stats;
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
    if (entry.hasReview && !window.confirm(`Разом з «${entry.game.title}» буде видалено вашу рецензію на цю гру. Продовжити?`)) return;
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
        <button type="button" role="tab" aria-selected={!status} className={`chip ${!status ? 'chip--active' : ''}`} onClick={() => setParams({})}>Усі<ChipCount value={stats?.totalGames} /></button>
        {STATUSES.map((s) => (
          <button key={s.value} type="button" role="tab" aria-selected={status === s.value}
            className={`chip ${status === s.value ? 'chip--active' : ''}`} onClick={() => setParams({ status: s.value })}>{s.label}<ChipCount value={stats?.byStatus?.[s.value]} /></button>
        ))}
      </div>

      {lib.loading && <Spinner />}
      {lib.error && <ErrorState error={lib.error} onRetry={lib.reload} />}
      {lib.data?.length === 0 && (
        <EmptyState title={status ? 'Тут поки порожньо' : 'Ваша бібліотека порожня'} text="Знайдіть гру в каталозі й додайте її в бібліотеку."
          action={<Link to="/" className="btn btn--primary">До каталогу</Link>} />
      )}
      {lib.data?.length > 0 && (
        <div className="grid">
          {lib.data.map((e, i) => (
            <GameCard key={e.id} game={e.game} index={i} showRating={false}
              meta={<>{e.game.releaseYear}{e.status === 'COMPLETED' && e.completedAt && <><br />пройдено {formatDate(e.completedAt)}</>}</>}
              footer={(
                <>
                  <Select className="select--status" size="xs" value={e.status} options={STATUSES}
                    onChange={(v) => changeStatus(e, v)} label={`Статус ${e.game.title}`} />
                  <IconButton icon="trash" label={`Прибрати «${e.game.title}» з бібліотеки`} onClick={() => remove(e)} danger />
                </>
              )} />
          ))}
        </div>
      )}
    </div>
  );
}
