import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useTheme, type ThemePreference } from "../theme/ThemeProvider";
import { apiFetch } from "../api/client";
import { SparkLogo } from "./sketch/SparkLogo";
import "./TopBar.css";

type NavKey = "Projects" | "Libraries" | "Trash";

const NAV_LINKS: { key: NavKey; to: string; match: (p: string) => boolean }[] = [
  {
    key: "Projects",
    to: "/",
    match: (p) =>
      p === "/" || p.startsWith("/projects") || p.startsWith("/boards"),
  },
  { key: "Libraries", to: "/libraries", match: (p) => p.startsWith("/libraries") },
  { key: "Trash", to: "/trash", match: (p) => p.startsWith("/trash") },
];

const THEME_CYCLE: ThemePreference[] = ["system", "light", "dark"];

export function TopBar(): JSX.Element {
  const { user, logout, setThemePreference } = useAuth();
  const { preference, setPreference } = useTheme();
  const { pathname } = useLocation();

  const activeKey: NavKey =
    NAV_LINKS.find((l) => l.match(pathname))?.key ?? "Projects";

  const setTheme = async (next: ThemePreference): Promise<void> => {
    setPreference(next);
    if (user) {
      setThemePreference(next);
      try {
        await apiFetch("/api/me/theme", {
          method: "PATCH",
          body: { theme: next },
        });
      } catch {
        /* persist later on retry */
      }
    }
  };

  const cycleTheme = (): void => {
    const next =
      THEME_CYCLE[(THEME_CYCLE.indexOf(preference) + 1) % THEME_CYCLE.length]!;
    void setTheme(next);
  };

  return (
    <header className="appchrome">
      <div className="appchrome__left">
        <Link to="/" className="appchrome__brand" aria-label="Excaliprojects home">
          <SparkLogo size={20} />
          <span>Excaliprojects</span>
        </Link>
        <nav className="appchrome__nav">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.key}
              to={link.to}
              className={`appchrome__navlink${
                activeKey === link.key ? " is-active" : ""
              }`}
            >
              {link.key}
            </Link>
          ))}
        </nav>
      </div>
      <div className="appchrome__right">
        <ThemeChip
          preference={preference}
          onCycle={cycleTheme}
          onPick={(p) => void setTheme(p)}
        />
        {user && (
          <>
            <span className="appchrome__user" title={user.username}>
              {user.username}
            </span>
            <button
              type="button"
              className="appchrome__logout"
              onClick={() => void logout()}
            >
              Log out
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function ThemeChip({
  preference,
  onCycle,
  onPick,
}: {
  preference: ThemePreference;
  onCycle: () => void;
  onPick: (p: ThemePreference) => void;
}): JSX.Element {
  return (
    <div className="themechip" role="group" aria-label="Theme">
      <button
        type="button"
        className={`themechip__seg${preference === "system" ? " is-active" : ""}`}
        onClick={() => onPick("system")}
        title="Match system"
      >
        Auto
      </button>
      <button
        type="button"
        className={`themechip__seg themechip__seg--icon${
          preference === "dark" ? " is-active" : ""
        }`}
        onClick={() => onPick("dark")}
        title="Dark"
        aria-label="Dark theme"
      >
        ☾
      </button>
      <button
        type="button"
        className={`themechip__seg themechip__seg--icon${
          preference === "light" ? " is-active" : ""
        }`}
        onClick={() => onPick("light")}
        title="Light"
        aria-label="Light theme"
      >
        ☀
      </button>
      <button
        type="button"
        className="themechip__cycle"
        onClick={onCycle}
        aria-label="Cycle theme"
        title="Cycle theme"
      >
        ⟳
      </button>
    </div>
  );
}
