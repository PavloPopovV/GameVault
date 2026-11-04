import { useState } from 'react';
import ActionsMenu from './ActionsMenu.jsx';
import Modal from './Modal.jsx';
import ReviewForm from './ReviewForm.jsx';
import { formatDate } from '../utils/constants.js';

/**
 * Єдина плашка рецензії (сторінка гри і профіль):
 * зліва фото (аватар автора або обкладинка гри), поруч назва + оцінка, нижче текст, ще нижче дата.
 * Якщо передано onUpdate / onDelete — праворуч меню «⋯» з «Редагувати» і «Видалити» (модалки).
 */
function Votes({ review, onVote }) {
  const [votes, setVotes] = useState({ likes: review.likes ?? 0, dislikes: review.dislikes ?? 0, myVote: review.myVote ?? 0 });
  const [busy, setBusy] = useState(false);
  const readOnly = !onVote;

  const click = async (clicked) => {
    if (busy) return;
    const prev = votes;
    const next = prev.myVote === clicked ? 0 : clicked; // повторний клік знімає голос
    // Оптимістично оновлюємо лічильники, а після відповіді сервера беремо точні
    setVotes({
      myVote: next,
      likes: prev.likes - (prev.myVote === 1 ? 1 : 0) + (next === 1 ? 1 : 0),
      dislikes: prev.dislikes - (prev.myVote === -1 ? 1 : 0) + (next === -1 ? 1 : 0),
    });
    setBusy(true);
    try {
      const fresh = await onVote(next);
      if (fresh) setVotes({ likes: fresh.likes, dislikes: fresh.dislikes, myVote: fresh.myVote });
      else setVotes(prev);
    } catch {
      setVotes(prev);
    } finally { setBusy(false); }
  };

  // Звичайна функція, а не компонент: інакше кнопка перемонтовується і губить фокус після кліку
  const renderBtn = ({ value, emoji, count, label }) => (readOnly ? (
    <span key={value} className="vote vote--static" title={label}><span aria-hidden="true">{emoji}</span> {count}<span className="sr-only"> {label}</span></span>
  ) : (
    <button key={value} type="button" className={`vote ${votes.myVote === value ? 'vote--active' : ''} ${value === 1 ? 'vote--up' : 'vote--down'}`}
      onClick={() => click(value)} aria-pressed={votes.myVote === value} aria-label={`${label}: ${count}`} title={label}>
      <span aria-hidden="true">{emoji}</span> {count}
    </button>
  ));

  return (
    <span className="votes">
      {renderBtn({ value: 1, emoji: '👍', count: votes.likes, label: 'Корисна рецензія' })}
      {renderBtn({ value: -1, emoji: '👎', count: votes.dislikes, label: 'Не згоден' })}
    </span>
  );
}

export default function ReviewCard({ review, media, title, mine = false, clamp = false, onUpdate, onDelete, onVote, moderation = false }) {
  const [dialog, setDialog] = useState(null); // 'edit' | 'delete' | null
  const [busy, setBusy] = useState(false);
  const close = () => setDialog(null);
  const canManage = Boolean(onUpdate && onDelete);

  const save = async (body) => { await onUpdate(body); close(); };
  const remove = async () => {
    setBusy(true);
    try { await onDelete(); close(); } finally { setBusy(false); }
  };

  return (
    <article className={`review-card card liquid ${mine ? 'review-card--mine' : ''}`}>
      <div className="review-card__media">{media}</div>
      <div className="review-card__body">
        <div className="review-card__head">
          <span className="review-card__title">{title}</span>
          <span className="rating review-card__rating" aria-label={`Оцінка ${review.rating} з 10`}>
            ★ {review.rating}<span className="muted">/10</span>
          </span>
          <span className="review-card__side">
            <Votes review={review} onVote={mine ? undefined : onVote} />
          {canManage && (
            <span className="review-card__menu">
              <ActionsMenu label={moderation ? 'Модерація рецензії' : 'Дії з рецензією'} items={[
                { label: 'Редагувати', onSelect: () => setDialog('edit') },
                { label: 'Видалити', onSelect: () => setDialog('delete'), danger: true, divider: true },
              ]} />
            </span>
          )}
          </span>
        </div>
        {review.text && <p className={`review-card__text ${clamp ? 'review-card__text--clamp' : ''}`}>{review.text}</p>}
        <span className="review-card__date">{formatDate(review.createdAt)}</span>
      </div>

      {canManage && (
        <>
          <Modal open={dialog === 'edit'} title={moderation ? 'Модерація: редагувати рецензію' : 'Редагувати рецензію'} onClose={close}>
            <ReviewForm plain initial={review} onSubmit={save} onCancel={close} submitLabel="Зберегти" />
          </Modal>
          <Modal open={dialog === 'delete'} title={moderation ? 'Модерація: видалити рецензію?' : 'Видалити рецензію?'} onClose={close}>
            <div className="form">
              <p className="modal__text">
                {moderation && 'Ви видаляєте чужу рецензію як адміністратор. '}
                Рецензію буде видалено назавжди. Цю дію <b>не можна скасувати</b>.
              </p>
              <div className="modal__actions">
                <button type="button" className="btn btn--ghost" onClick={close}>Скасувати</button>
                <button type="button" className="btn btn--danger-solid" onClick={remove} disabled={busy}>{busy ? 'Видаляємо…' : 'Видалити'}</button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </article>
  );
}
