import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, resetCsrfCache } from "../api/client";
import type { ThemePreference } from "../theme/ThemeProvider";

export interface CurrentUser {
  id: string;
  username: string;
  themePreference: ThemePreference;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setThemePreference: (p: ThemePreference) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await apiFetch<CurrentUser>("/api/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const me = await apiFetch<CurrentUser>("/api/login", {
      method: "POST",
      body: { username, password },
    });
    setUser(me);
    resetCsrfCache();
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/logout", { method: "POST" });
    } finally {
      setUser(null);
      resetCsrfCache();
    }
  }, []);

  const setThemePreference = useCallback((p: ThemePreference) => {
    setUser((u) => (u ? { ...u, themePreference: p } : u));
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh, setThemePreference }),
    [user, loading, login, logout, refresh, setThemePreference]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
