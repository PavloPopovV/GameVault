import { useEffect, useId, useRef, useState } from 'react';

/**
 * Кнопка-бургер з випадаючим меню дій під нею.
 * items: [{ label, onSelect, danger?, divider? }]
 * Клавіатура: Enter/Пробіл/↓ відкривають, ↑/↓ — рух по пунктах, Esc — закрити.
 */
export default function ActionsMenu({ items, label = 'Дії' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    const onPointer = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open]);

  const close = () => { setOpen(false); buttonRef.current?.focus(); };

  const onMenuKey = (e) => {
    const els = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
    const i = els.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length].focus(); }
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div className="menu" ref={rootRef}>
      <button
        type="button"
        ref={buttonRef}
        className={`menu__trigger ${open ? 'menu__trigger--open' : ''}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); } }}
      >
        <span /><span /><span />
      </button>
      {open && (
        <div className="menu__list liquid" role="menu" id={menuId} ref={menuRef} onKeyDown={onMenuKey}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`menu__item ${item.danger ? 'menu__item--danger' : ''} ${item.divider ? 'menu__item--divider' : ''}`}
              onClick={() => { close(); item.onSelect(); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
