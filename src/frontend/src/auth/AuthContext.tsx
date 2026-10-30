import { App } from 'antd';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, setSessionExpiredHandler, User } from '../lib/api';

export interface AuthState {
  user: User | null;
  /** True until the initial session check finishes. */
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  signup(name: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  useEffect(() => {
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      message.warning('Your session has expired. Please log in again.');
      navigate('/login', { state: { from: location.pathname } });
    });
    return () => setSessionExpiredHandler(null);
  }, [navigate, location.pathname, message]);

  const login = useCallback(async (email: string, password: string) => {
    setUser((await api.login({ email, password })).user);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    setUser((await api.signup({ name, email, password })).user);
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined); // the cookie expires on its own if the server is unreachable
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, signup, logout }), [user, loading, login, signup, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
