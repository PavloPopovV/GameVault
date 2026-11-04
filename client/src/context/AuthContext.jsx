import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStorage } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStorage.get()));

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const me = await api.me();
    setUser(me);
    return me;
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStorage.get()) return;
    refresh().catch(logout).finally(() => setLoading(false));
  }, [logout, refresh]);

  const authenticate = useCallback(async (fn, body) => {
    const { token } = await fn(body);
    tokenStorage.set(token);
    return refresh();
  }, [refresh]);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    login: (body) => authenticate(api.login, body),
    register: (body) => authenticate(api.register, body),
    logout,
    refresh,
  }), [user, loading, authenticate, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
