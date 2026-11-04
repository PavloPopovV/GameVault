import { useState } from 'react';
import { validateReview } from '../utils/validation.js';

export default function ReviewForm({ initial, onSubmit, onCancel, submitLabel = 'Опублікувати' }) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [text, setText] = useState(initial?.text ?? '');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const v = validateReview({ rating, text });
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await onSubmit({ rating, text: text.trim() });
      if (!initial) { setRating(0); setText(''); }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="review-form card" onSubmit={submit} noValidate>
      <div className="field">
        <span className="field__label">Оцінка</span>
        <div className="rating-picker" role="radiogroup" aria-label="Оцінка від 1 до 10">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n}
              className={`chip ${rating === n ? 'chip--active' : ''} ${rating && n <= rating ? 'chip--filled' : ''}`}
              onClick={() => setRating(n)}>{n}</button>
          ))}
        </div>
        {errors.rating && <span className="field__error">{errors.rating}</span>}
      </div>
      <label className="field">
        <span className="field__label">Рецензія</span>
        <textarea className={`input textarea ${errors.text ? 'input--error' : ''}`} rows={4} value={text}
          onChange={(e) => setText(e.target.value)} maxLength={2000}
          placeholder="Поділіться враженнями: що сподобалось, а що ні?" />
        <span className="field__hint">{text.trim().length} / 2000</span>
        {errors.text && <span className="field__error">{errors.text}</span>}
      </label>
      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Зберігаємо…' : submitLabel}</button>
        {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>Скасувати</button>}
      </div>
    </form>
  );
}
