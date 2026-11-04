import { useCallback, useEffect, useRef, useState } from 'react';

/** Завантажує дані й тримає три стани: loading / error / data. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      setState({ loading: false, error: null, data });
    } catch (error) {
      setState({ loading: false, error, data: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);

  const setData = useCallback((updater) => setState((s) => ({
    ...s, data: typeof updater === 'function' ? updater(s.data) : updater,
  })), []);

  return { ...state, reload: run, setData };
}
