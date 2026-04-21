import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";
import { SketchBorder } from "../components/sketch/SketchBorder";
import { SketchCard } from "../components/sketch/SketchCard";
import { SparkLogo } from "../components/sketch/SparkLogo";
import { GridBackdrop } from "../components/sketch/GridBackdrop";
import "./Login.css";

export function Login(): JSX.Element {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 429
            ? "Too many attempts. Please wait a minute and try again."
            : err.status === 401
              ? "Invalid username or password."
              : err.message
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login">
      <GridBackdrop opacity={0.035} size={28} />
      <FloatingDoodles />

      <div className="login__stage">
        <SketchCard
          radius={18}
          wobble={1.6}
          seed={3}
          fill="var(--color-panel)"
          style={{ padding: "34px 32px" }}
        >
          <div className="login__brand">
            <SparkLogo size={22} />
            <span>Excaliprojects</span>
          </div>
          <h1 className="login__title">Welcome back</h1>
          <p className="login__subtitle">
            Sign in to your Excaliprojects workspace.
          </p>

          <form className="login__form" onSubmit={handleSubmit} noValidate>
            <div className="login__field">
              <label htmlFor="username" className="login__label">
                Username
              </label>
              <div className="login__input-wrap">
                <SketchBorder
                  radius={9}
                  stroke="var(--color-line-hi)"
                  fill="var(--color-panel-lo)"
                  wobble={1.3}
                  seed={1}
                />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="login__input"
                />
              </div>
            </div>

            <div className="login__field">
              <label htmlFor="password" className="login__label">
                Password
              </label>
              <div className="login__input-wrap">
                <SketchBorder
                  radius={9}
                  stroke="var(--color-line-hi)"
                  fill="var(--color-panel-lo)"
                  wobble={1.3}
                  seed={2}
                />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="login__input login__input--password"
                />
              </div>
            </div>

            {error && (
              <p className="login__error" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting}
              className="login__submit"
            >
              {submitting ? "Signing in…" : "Sign in →"}
            </Button>
          </form>

          <div className="login__footer">
            Single-user workspace · seeded from <code>.env</code> on first boot.
          </div>
        </SketchCard>
      </div>
    </main>
  );
}

function FloatingDoodles(): JSX.Element {
  return (
    <svg className="login__doodles" aria-hidden>
      <defs>
        <filter id="login-wob">
          <feTurbulence baseFrequency="0.03" numOctaves="2" />
          <feDisplacementMap in="SourceGraphic" scale="1.8" />
        </filter>
      </defs>
      <g
        stroke="var(--color-line-hi)"
        strokeWidth={1.4}
        fill="none"
        filter="url(#login-wob)"
        strokeLinecap="round"
      >
        <rect x="6%" y="18%" width="110" height="70" rx="6" />
        <path d="M82% 22% L90% 28% L82% 34% L74% 28% Z" />
        <path d="M10% 82% L22% 80%" />
        <path d="M21% 79% L22% 80% L21% 81%" />
        <circle cx="88%" cy="72%" r="38" />
        <path d="M6% 52% C 9% 48% 11% 56% 14% 52% S 19% 48% 22% 52%" />
      </g>
    </svg>
  );
}
