import { useEffect, useId, useRef, useState } from 'react';

/**
 * Кастомний випадаючий список замість нативного <select>:
 * нативний список опцій неможливо застилізувати (на Windows він завжди синій).
 * Клавіатура: ↑/↓, Home/End, Enter/Пробіл — вибір, Esc — закрити.
 *
 * options: [{ value, label, tone? }] — tone додає кольорову крапку (статуси бібліотеки).
 */
export default function Select({ value, options, onChange, label, id, size = 'md', className = '', renderValue }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options[selectedIndex];

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const show = () => { setActive(selectedIndex); setOpen(true); };

  const choose = (i) => {
    setOpen(false);
    buttonRef.current?.focus();
    const option = options[i];
    if (option && option.value !== value) onChange(option.value);
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show(); }
      return;
    }
    const keys = {
      ArrowDown: () => setActive((i) => Math.min(options.length - 1, i + 1)),
      ArrowUp: () => setActive((i) => Math.max(0, i - 1)),
      Home: () => setActive(0),
      End: () => setActive(options.length - 1),
      Enter: () => choose(active),
      ' ': () => choose(active),
      Escape: () => setOpen(false),
    };
    if (e.key === 'Tab') { setOpen(false); return; }
    if (keys[e.key]) { e.preventDefault(); keys[e.key](); }
  };

  const optionId = (i) => `${listId}-opt-${i}`;

  return (
    <div className={`dropdown ${open ? 'dropdown--open' : ''}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        ref={buttonRef}
        role="combobox"
        className={`select select--${size} dropdown__button ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        {current?.tone && <span className={`dot status--${current.tone}`} aria-hidden="true" />}
        <span className="dropdown__value">{renderValue ? renderValue(current) : current?.label}</span>
      </button>

      {open && (
        <ul className="dropdown__menu" role="listbox" id={listId} aria-label={label} ref={listRef}>
          {options.map((o, i) => (
            <li
              key={o.value}
              id={optionId(i)}
              data-index={i}
              role="option"
              aria-selected={o.value === value}
              className={`dropdown__option ${i === active ? 'dropdown__option--active' : ''} ${o.value === value ? 'dropdown__option--selected' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
            >
              {o.tone && <span className={`dot status--${o.tone}`} aria-hidden="true" />}
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
