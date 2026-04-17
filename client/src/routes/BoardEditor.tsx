import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { exportToBlob } from "@excalidraw/excalidraw";
import { boardsApi, type Board } from "../api/boards";
import { ApiError } from "../api/client";
import { useTheme } from "../theme/ThemeProvider";
import { ExcalidrawHost, type SceneSnapshot } from "../components/ExcalidrawHost";
import { TagEditor } from "../components/TagEditor";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import "./BoardEditor.css";

const AUTOSAVE_DEBOUNCE_MS = 1500;

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function BoardEditor(): JSX.Element {
  const { boardId = "" } = useParams<{ boardId: string }>();
  const { resolved: theme } = useTheme();

  const [board, setBoard] = useState<Board | null>(null);
  const [initialScene, setInitialScene] = useState<SceneSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const pendingScene = useRef<SceneSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const b = await boardsApi.get(boardId);
        if (cancelled) return;
        setBoard(b);
        const scene = (b.scene_json as Partial<SceneSnapshot> | null) ?? null;
        setInitialScene(
          scene && scene.elements
            ? {
                elements: scene.elements ?? [],
                appState: scene.appState ?? {},
                files: scene.files ?? {},
              }
            : { elements: [], appState: {}, files: {} }
        );
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "Failed to load board");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  const uploadThumbnailFor = useCallback(
    async (scene: SceneSnapshot) => {
      if (scene.elements.length === 0) return;
      try {
        const blob = await exportToBlob({
          elements: scene.elements,
          appState: {
            ...scene.appState,
            exportBackground: true,
            exportWithDarkMode: false,
            viewBackgroundColor: scene.appState.viewBackgroundColor ?? "#ffffff",
          },
          files: scene.files,
          getDimensions: () => ({ width: 400, height: 300 }),
          mimeType: "image/png",
        });
        await boardsApi.uploadThumbnail(boardId, blob);
      } catch (err) {
        console.warn("thumbnail upload failed", err);
      }
    },
    [boardId]
  );

  const flushSave = useCallback(async () => {
    const scene = pendingScene.current;
    if (!scene) return;
    setStatus("saving");
    try {
      await boardsApi.saveScene(boardId, {
        elements: scene.elements,
        appState: {
          viewBackgroundColor: scene.appState.viewBackgroundColor,
          gridSize: scene.appState.gridSize,
          zoom: scene.appState.zoom,
        },
        files: scene.files,
      });
      setStatus("saved");
      void uploadThumbnailFor(scene);
    } catch (err) {
      console.error("save failed", err);
      setStatus("error");
    }
  }, [boardId, uploadThumbnailFor]);

  const debouncedSave = useDebouncedCallback(() => {
    void flushSave();
  }, AUTOSAVE_DEBOUNCE_MS);

  const handleChange = useCallback(
    (scene: SceneSnapshot) => {
      pendingScene.current = scene;
      setStatus((prev) => (prev === "saving" ? prev : "dirty"));
      debouncedSave();
    },
    [debouncedSave]
  );

  // Save on unmount / tab hide.
  useEffect(() => {
    const onHide = (): void => {
      if (pendingScene.current) {
        const data = JSON.stringify({
          elements: pendingScene.current.elements,
          appState: {},
          files: pendingScene.current.files,
        });
        try {
          navigator.sendBeacon(
            `/api/boards/${boardId}/scene`,
            new Blob([data], { type: "application/json" })
          );
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flushSave();
    };
  }, [boardId, flushSave]);

  if (loadError) {
    return (
      <div className="board-editor board-editor--error">
        <p>{loadError}</p>
        <Link to="/">Back to dashboard</Link>
      </div>
    );
  }

  if (!board || !initialScene) {
    return (
      <div className="board-editor board-editor--loading">
        <span className="boot__spinner" aria-hidden />
        <span>Opening board…</span>
      </div>
    );
  }

  return (
    <div className="board-editor">
      <div className="board-editor__bar">
        <Link to={`/projects/${board.project_id}`} className="board-editor__back">
          ← Back
        </Link>
        <span className="board-editor__name">{board.name}</span>
        <div className="board-editor__tags">
          <TagEditor boardId={board.id} />
        </div>
        <SaveIndicator status={status} />
      </div>
      <div className="board-editor__canvas">
        <ExcalidrawHost initialScene={initialScene} theme={theme} onChange={handleChange} />
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }): JSX.Element {
  const label = {
    idle: "Ready",
    dirty: "Unsaved…",
    saving: "Saving…",
    saved: "Saved",
    error: "Save failed",
  }[status];
  return (
    <span className={`save save--${status}`} role="status" aria-live="polite">
      {label}
    </span>
  );
}
