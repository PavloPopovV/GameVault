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
export default function ReviewCard({ review, media, title, mine = false, clamp = false, onUpdate, onDelete }) {
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
    <article className={`review-card card ${mine ? 'review-card--mine' : ''}`}>
      <div className="review-card__media">{media}</div>
      <div className="review-card__body">
        <div className="review-card__head">
          <span className="review-card__title">{title}</span>
          <span className="rating review-card__rating" aria-label={`Оцінка ${review.rating} з 10`}>
            ★ {review.rating}<span className="muted">/10</span>
          </span>
          {canManage && (
            <span className="review-card__menu">
              <ActionsMenu label="Дії з рецензією" items={[
                { label: 'Редагувати', onSelect: () => setDialog('edit') },
                { label: 'Видалити', onSelect: () => setDialog('delete'), danger: true, divider: true },
              ]} />
            </span>
          )}
        </div>
        {review.text && <p className={`review-card__text ${clamp ? 'review-card__text--clamp' : ''}`}>{review.text}</p>}
        <span className="review-card__date">{formatDate(review.createdAt)}</span>
      </div>

      {canManage && (
        <>
          <Modal open={dialog === 'edit'} title="Редагувати рецензію" onClose={close}>
            <ReviewForm plain initial={review} onSubmit={save} onCancel={close} submitLabel="Зберегти" />
          </Modal>
          <Modal open={dialog === 'delete'} title="Видалити рецензію?" onClose={close}>
            <div className="form">
              <p className="modal__text">Рецензію буде видалено назавжди. Цю дію <b>не можна скасувати</b>.</p>
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
