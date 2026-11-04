// Квадратна кнопка-іконка (напр., «Прибрати»). label — і підказка, і текст для скрінрідера.
const ICONS = {
  trash: (
    <>
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </>
  ),
};

export default function IconButton({ icon, label, onClick, danger = false }) {
  return (
    <button type="button" className={`btn-icon ${danger ? 'btn-icon--danger' : ''}`} onClick={onClick} aria-label={label} title={label}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONS[icon]}
      </svg>
    </button>
  );
}
