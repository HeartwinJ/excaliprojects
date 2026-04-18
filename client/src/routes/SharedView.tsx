import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { shareApi, type PublicBoard } from "../api/share";
import { useTheme } from "../theme/ThemeProvider";
import { ExcalidrawHost, type SceneSnapshot } from "../components/ExcalidrawHost";
import "./SharedView.css";

export function SharedView(): JSX.Element {
  const { token = "" } = useParams<{ token: string }>();
  const { resolved: theme } = useTheme();

  const [board, setBoard] = useState<PublicBoard | null>(null);
  const [scene, setScene] = useState<SceneSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void shareApi
      .getPublic(token)
      .then((b) => {
        if (cancelled) return;
        setBoard(b);
        const s = (b.scene_json as Partial<SceneSnapshot> | null) ?? null;
        setScene({
          elements: s?.elements ?? [],
          appState: s?.appState ?? {},
          files: s?.files ?? {},
        });
      })
      .catch(() => {
        if (!cancelled) setError("This link is not valid or has been revoked.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <div className="shared shared--error">
        <h1>Link unavailable</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!board || !scene) {
    return (
      <div className="shared shared--loading">
        <span className="boot__spinner" aria-hidden />
        <span>Loading board…</span>
      </div>
    );
  }

  return (
    <div className="shared">
      <header className="shared__bar">
        <span className="shared__mark" aria-hidden>
          ✦
        </span>
        <span className="shared__title">{board.name}</span>
        <span className="shared__badge">Read-only</span>
        <a href="https://excalidraw.com" target="_blank" rel="noreferrer" className="shared__powered">
          Made with Excalidraw
        </a>
      </header>
      <div className="shared__canvas">
        <ExcalidrawHost
          initialScene={scene}
          theme={theme}
          viewModeEnabled
          onChange={() => undefined}
        />
      </div>
    </div>
  );
}
