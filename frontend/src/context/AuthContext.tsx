import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService, type LoginResponse } from '@/services/auth';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  register: (data: Parameters<typeof authService.register>[0]) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  const refreshUser = useCallback(async () => {
    try {
      const user = await authService.me();
      setState({ user, loading: false });
    } catch {
      setState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res: LoginResponse = await authService.login({ email, password });

    // ✅ FIXED: Properly handle discriminated union response
    if (res.success === false) {
      throw new Error(res.message || 'Login failed');
    }

    if (!res.data?.user) {
      throw new Error('Login failed: malformed server response.');
    }

    const user = res.data.user;
    setState({ user, loading: false });
    return user;
  }, []);

  const register = useCallback(async (data: Parameters<typeof authService.register>[0]) => {
    await authService.register(data);
    setState((s) => ({ ...s, loading: false }));
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setState({ user: null, loading: false });
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
