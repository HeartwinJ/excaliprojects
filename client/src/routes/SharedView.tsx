import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MainMenu } from "@excalidraw/excalidraw";
import { shareApi, type PublicBoard } from "../api/share";
import { useTheme } from "../theme/ThemeProvider";
import { ExcalidrawHost, type SceneSnapshot } from "../components/ExcalidrawHost";
import { SparkLogo } from "../components/sketch/SparkLogo";
import { SketchBorder } from "../components/sketch/SketchBorder";
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
        if (!cancelled)
          setError("This link is not valid or has been revoked.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <div className="shared shared--error">
        <h1 className="shared__error-title">Link unavailable</h1>
        <p className="mono">{error}</p>
      </div>
    );
  }

  if (!board || !scene) {
    return (
      <div className="shared shared--loading">
        <span className="boot__spinner" aria-hidden />
        <span className="mono">Loading board…</span>
      </div>
    );
  }

  return (
    <div className="shared">
      <header className="shared__bar">
        <div className="shared__brand">
          <SparkLogo size={18} />
          <span>Excaliprojects</span>
        </div>
        <span className="shared__title">{board.name}</span>
        <span className="shared__badge">
          <SketchBorder
            radius={6}
            stroke="var(--color-accent-dim)"
            fill="rgba(165, 153, 233, 0.12)"
            wobble={1.1}
          />
          <span>Read-only</span>
        </span>
        <a
          href="https://excalidraw.com"
          target="_blank"
          rel="noreferrer"
          className="shared__powered mono"
        >
          Made with Excalidraw
        </a>
      </header>
      <div className="shared__canvas">
        <ExcalidrawHost
          initialScene={scene}
          theme={theme}
          viewModeEnabled
          onChange={() => undefined}
          menu={
            <>
              <MainMenu.DefaultItems.SaveAsImage />
              <MainMenu.DefaultItems.ChangeCanvasBackground />
            </>
          }
        />
      </div>
    </div>
  );
}
