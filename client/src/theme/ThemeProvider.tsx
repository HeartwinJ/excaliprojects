import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolve(pref: ThemePreference): ResolvedTheme {
  if (pref === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

interface ThemeProviderProps {
  initial?: ThemePreference;
  onPreferenceChange?: (p: ThemePreference) => void;
  children: React.ReactNode;
}

const STORAGE_KEY = "excaliprojects.theme";

export function ThemeProvider({
  initial,
  onPreferenceChange,
  children,
}: ThemeProviderProps): JSX.Element {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (initial) return initial;
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") return stored;
    }
    return "system";
  });

  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(preference));

  useEffect(() => {
    setResolved(resolve(preference));
    if (preference !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (): void => setResolved(resolve(preference));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const setPreference = useCallback(
    (p: ThemePreference) => {
      setPreferenceState(p);
      try {
        window.localStorage.setItem(STORAGE_KEY, p);
      } catch {
        /* ignore quota errors */
      }
      onPreferenceChange?.(p);
    },
    [onPreferenceChange]
  );

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
