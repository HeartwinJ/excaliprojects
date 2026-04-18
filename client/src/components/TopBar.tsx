import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useTheme, type ThemePreference } from "../theme/ThemeProvider";
import { apiFetch } from "../api/client";
import "./TopBar.css";

const THEME_LABEL: Record<ThemePreference, string> = {
  system: "Auto",
  light: "Light",
  dark: "Dark",
};

const THEME_CYCLE: ThemePreference[] = ["system", "light", "dark"];

export function TopBar(): JSX.Element {
  const { user, logout, setThemePreference } = useAuth();
  const { preference, setPreference } = useTheme();

  const cycleTheme = async (): Promise<void> => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(preference) + 1) % THEME_CYCLE.length]!;
    setPreference(next);
    if (user) {
      setThemePreference(next);
      try {
        await apiFetch("/api/me/theme", { method: "PATCH", body: { theme: next } });
      } catch {
        /* persist later on retry */
      }
    }
  };

  return (
    <header className="topbar">
      <Link to="/" className="topbar__brand">
        <span className="topbar__mark" aria-hidden>
          ✦
        </span>
        <span className="topbar__name">Excaliprojects</span>
      </Link>
      <nav className="topbar__nav">
        <Link to="/libraries" className="topbar__navlink">
          Libraries
        </Link>
        <Link to="/trash" className="topbar__navlink">
          Trash
        </Link>
      </nav>
      <div className="topbar__spacer" />
      <button type="button" className="topbar__btn" onClick={() => void cycleTheme()} aria-label="Toggle theme">
        <span className="topbar__btn-label">{THEME_LABEL[preference]}</span>
      </button>
      {user && (
        <>
          <span className="topbar__user" title={user.username}>
            {user.username}
          </span>
          <button
            type="button"
            className="topbar__btn topbar__btn--ghost"
            onClick={() => void logout()}
          >
            Log out
          </button>
        </>
      )}
    </header>
  );
}
