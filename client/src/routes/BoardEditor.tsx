import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { exportToBlob, getSceneVersion, MainMenu } from "@excalidraw/excalidraw";
import { boardsApi, type Board } from "../api/boards";
import { librariesApi } from "../api/libraries";
import { ApiError } from "../api/client";
import { useTheme } from "../theme/ThemeProvider";
import { ExcalidrawHost, type SceneSnapshot } from "../components/ExcalidrawHost";
import { TagEditor } from "../components/TagEditor";
import { HistoryPanel } from "../components/HistoryPanel";
import { ShareDialog } from "../components/ShareDialog";
import { Button } from "../components/Button";
import { SketchBorder } from "../components/sketch/SketchBorder";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { REPO_ISSUES_URL, REPO_README_URL } from "../config/links";
import "./BoardEditor.css";

const AUTOSAVE_DEBOUNCE_MS = 1500;

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function BoardEditor(): JSX.Element {
  const { boardId = "" } = useParams<{ boardId: string }>();
  const { resolved: theme } = useTheme();
  const navigate = useNavigate();

  const [board, setBoard] = useState<Board | null>(null);
  const [initialScene, setInitialScene] = useState<SceneSnapshot | null>(null);
  const [libraryItems, setLibraryItems] = useState<unknown[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sceneVersion, setSceneVersion] = useState(0);

  useEffect(() => {
    void librariesApi
      .items()
      .then(setLibraryItems)
      .catch(() => setLibraryItems([]));
  }, []);

  const pendingScene = useRef<SceneSnapshot | null>(null);
  // Last element-version we've seen; used to skip spurious onChange fires
  // (cursor moves, selection) that would otherwise flip us to "dirty".
  const lastElementsVersion = useRef<number | null>(null);
  // Last files signature — Excalidraw also fires onChange when embedded images
  // are added/removed without the elements array changing.
  const lastFilesKey = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const b = await boardsApi.get(boardId);
        if (cancelled) return;
        setBoard(b);
        const scene = (b.scene_json as Partial<SceneSnapshot> | null) ?? null;
        const snapshot: SceneSnapshot =
          scene && scene.elements
            ? {
                elements: scene.elements ?? [],
                appState: scene.appState ?? {},
                files: scene.files ?? {},
              }
            : { elements: [], appState: {}, files: {} };
        setInitialScene(snapshot);
        // Seed the change-detection refs so the very first onChange (which
        // Excalidraw fires right after loading the scene) is treated as a
        // no-op.
        lastElementsVersion.current = getSceneVersion(snapshot.elements);
        lastFilesKey.current = filesKey(snapshot.files);
        setStatus("idle");
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError ? err.message : "Failed to load board"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boardId, sceneVersion]);

  const uploadThumbnailFor = useCallback(
    async (scene: SceneSnapshot) => {
      if (scene.elements.length === 0) return;
      try {
        const isDark = theme === "dark";
        // Fall back to our theme-matching ink/panel color if the scene
        // doesn't have an explicit viewBackgroundColor (fresh canvas).
        const fallbackBg = isDark ? "#17171a" : "#ffffff";
        const blob = await exportToBlob({
          elements: scene.elements,
          appState: {
            ...scene.appState,
            exportBackground: true,
            exportWithDarkMode: isDark,
            viewBackgroundColor:
              scene.appState.viewBackgroundColor ?? fallbackBg,
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
    [boardId, theme]
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
      const version = getSceneVersion(scene.elements);
      const fkey = filesKey(scene.files);
      if (
        lastElementsVersion.current !== null &&
        version === lastElementsVersion.current &&
        fkey === lastFilesKey.current
      ) {
        // No meaningful change — cursor moves, selection toggles, etc.
        return;
      }
      lastElementsVersion.current = version;
      lastFilesKey.current = fkey;
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
        <p className="mono">{loadError}</p>
        <Link to="/" className="board-editor__error-link">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!board || !initialScene) {
    return (
      <div className="board-editor board-editor--loading">
        <span className="boot__spinner" aria-hidden />
        <span className="mono">Opening board…</span>
      </div>
    );
  }

  const boardPath = `/projects/${board.project_id}`;

  return (
    <div className="board-editor">
      <div className="board-editor__bar">
        <div className="board-editor__bar-left">
          <Link to={boardPath} className="board-editor__back">
            ← Back
          </Link>
          <span className="board-editor__name" title={board.name}>
            {board.name}
          </span>
          <div className="board-editor__tags">
            <TagEditor boardId={board.id} />
          </div>
        </div>
        <div className="board-editor__bar-right">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setHistoryOpen(true)}
          >
            History
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShareOpen(true)}>
            Share
          </Button>
          <SaveIndicator status={status} />
        </div>
      </div>
      <div className="board-editor__canvas">
        <ExcalidrawHost
          initialScene={initialScene}
          theme={theme}
          libraryItems={libraryItems}
          onChange={handleChange}
          menu={
            <>
              <MainMenu.Group title="Board">
                <MainMenu.Item onSelect={() => navigate(boardPath)}>
                  Back to project
                </MainMenu.Item>
                <MainMenu.Item onSelect={() => navigate("/")}>
                  Dashboard
                </MainMenu.Item>
              </MainMenu.Group>
              <MainMenu.Separator />
              <MainMenu.Group title="Canvas">
                <MainMenu.DefaultItems.SaveAsImage />
                <MainMenu.DefaultItems.ChangeCanvasBackground />
                <MainMenu.DefaultItems.ClearCanvas />
              </MainMenu.Group>
              <MainMenu.Separator />
              <MainMenu.Group title="This board">
                <MainMenu.Item onSelect={() => setHistoryOpen(true)}>
                  Version history…
                </MainMenu.Item>
                <MainMenu.Item onSelect={() => setShareOpen(true)}>
                  Share link…
                </MainMenu.Item>
              </MainMenu.Group>
              <MainMenu.Separator />
              <MainMenu.Group title="Workspace">
                <MainMenu.Item onSelect={() => navigate("/libraries")}>
                  Libraries
                </MainMenu.Item>
                <MainMenu.Item onSelect={() => navigate("/trash")}>
                  Trash
                </MainMenu.Item>
              </MainMenu.Group>
              <MainMenu.Separator />
              <MainMenu.Group title="Help">
                <MainMenu.ItemLink
                  href={REPO_README_URL}
                  icon={<ExternalIcon />}
                >
                  Documentation
                </MainMenu.ItemLink>
                <MainMenu.ItemLink
                  href={REPO_ISSUES_URL}
                  icon={<ExternalIcon />}
                >
                  Report an issue
                </MainMenu.ItemLink>
              </MainMenu.Group>
            </>
          }
        />
      </div>
      <HistoryPanel
        boardId={board.id}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestore={() => {
          pendingScene.current = null;
          lastElementsVersion.current = null;
          lastFilesKey.current = "";
          setSceneVersion((n) => n + 1);
        }}
      />
      <ShareDialog
        boardId={board.id}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}

function ExternalIcon(): JSX.Element {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 16 16"
      aria-hidden
      style={{ display: "block" }}
    >
      <path
        d="M6 3 H4 A1 1 0 0 0 3 4 V12 A1 1 0 0 0 4 13 H12 A1 1 0 0 0 13 12 V10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M9 3 H13 V7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 3 L8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function filesKey(files: SceneSnapshot["files"]): string {
  if (!files) return "";
  const keys = Object.keys(files);
  if (keys.length === 0) return "";
  return keys.sort().join("|");
}

function SaveIndicator({ status }: { status: SaveStatus }): JSX.Element | null {
  // "idle" = no unsaved work → don't render at all.
  if (status === "idle") return null;
  const label = {
    dirty: "Unsaved…",
    saving: "Saving…",
    saved: "Saved",
    error: "Save failed",
  }[status];
  const stroke = {
    dirty: "var(--color-amber)",
    saving: "var(--color-accent)",
    saved: "var(--color-mint)",
    error: "var(--color-rose)",
  }[status];
  const fill = {
    dirty: "rgba(242, 181, 89, 0.1)",
    saving: "rgba(165, 153, 233, 0.1)",
    saved: "rgba(143, 214, 181, 0.1)",
    error: "rgba(232, 138, 138, 0.1)",
  }[status];
  return (
    <span
      className={`save save--${status}`}
      role="status"
      aria-live="polite"
    >
      <SketchBorder radius={6} stroke={stroke} fill={fill} wobble={1.1} />
      <span>{label}</span>
    </span>
  );
}
