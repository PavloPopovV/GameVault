import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import GameCard from '../components/GameCard.jsx';
import IconButton from '../components/IconButton.jsx';
import Select from '../components/Select.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/States.jsx';
import { STATUSES, formatDate } from '../utils/constants.js';

// Підпис з датою залежно від статусу. updatedAt змінюється лише при зміні статусу,
// тож для «Граю» і «Закинув» це дата, коли гру перевели в цей статус.
function statusDate(e) {
  switch (e.status) {
    case 'COMPLETED': return `пройдено ${formatDate(e.completedAt ?? e.updatedAt)}`;
    case 'DROPPED': return `закинуто ${formatDate(e.updatedAt)}`;
    case 'PLAYING': return `граю з ${formatDate(e.updatedAt)}`;
    default: return `додано ${formatDate(e.addedAt)}`;
  }
}

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

  const [pending, setPending] = useState(null); // гра з рецензією, яку прибираємо — чекає підтвердження
  const doRemove = async (entry) => {
    try {
      await api.removeFromLibrary(entry.gameId);
      lib.setData((list) => list.filter((e) => e.id !== entry.id));
      toast.success(`«${entry.game.title}» прибрано з бібліотеки`);
    } catch (err) { toast.error(err.message); throw err; }
  };
  // Рецензія можлива лише на гру з бібліотеки (GV-21) — тож спершу попереджаємо в модалці
  const remove = (entry) => (entry.hasReview ? setPending(entry) : doRemove(entry).catch(() => {}));

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

      {lib.loading && !lib.data?.length && <Spinner />}
      {lib.error && <ErrorState error={lib.error} onRetry={lib.reload} />}
      {!lib.loading && lib.data?.length === 0 && (
        <EmptyState title={status ? 'Тут поки порожньо' : 'Ваша бібліотека порожня'} text="Знайдіть гру в каталозі й додайте її в бібліотеку."
          action={<Link to="/" className="btn btn--primary">До каталогу</Link>} />
      )}
      {lib.data?.length > 0 && (
        // Як у каталозі: старі картки приглушуються, поки вантажиться вкладка, нові з'являються з анімацією
        <div key={lib.data.map((e) => e.id).join('-')} className={`grid grid--animated ${lib.loading ? 'grid--busy' : ''}`} aria-busy={lib.loading}>
          {lib.data.map((e, i) => (
            <GameCard key={e.id} game={e.game} index={i} showRating={false}
              meta={<>{e.game.releaseYear}<br />{statusDate(e)}</>}
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
      <ConfirmDialog open={Boolean(pending)} title="Прибрати гру з бібліотеки?" confirmLabel="Прибрати" danger
        onConfirm={() => doRemove(pending)} onClose={() => setPending(null)}>
        Разом з «{pending?.game.title}» буде видалено вашу рецензію на цю гру. Цю дію <b>не можна скасувати</b>.
      </ConfirmDialog>
    </div>
  );
}
