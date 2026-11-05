import { useState } from 'react';
import Modal from './Modal.jsx';

/** Модалка підтвердження замість системного window.confirm — у стилі сайту. */
export default function ConfirmDialog({ open, title, children, confirmLabel = 'Підтвердити', danger = false, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try { await onConfirm(); onClose(); } catch { /* помилку показує той, хто викликав (toast) */ } finally { setBusy(false); }
  };
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="form">
        <p className="modal__text">{children}</p>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Скасувати</button>
          <button type="button" className={`btn ${danger ? 'btn--danger-solid' : 'btn--primary'}`} onClick={confirm} disabled={busy}>
            {busy ? 'Зачекайте…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
