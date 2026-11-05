import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);
  const push = useCallback((type, message) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, type, message }]);
    timers.current.set(id, setTimeout(() => dismiss(id), 4000));
  }, [dismiss]);

  // Прибираємо всі таймери при розмонтуванні провайдера
  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach(clearTimeout); map.clear(); };
  }, []);

  const value = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <span>{t.message}</span>
            <button type="button" className="toast__close" onClick={() => dismiss(t.id)} aria-label="Закрити">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
