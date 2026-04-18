import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { Excalidraw, THEME } from "@excalidraw/excalidraw";

export interface SceneSnapshot {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

interface ExcalidrawHostProps {
  initialScene: SceneSnapshot | null;
  theme: "light" | "dark";
  libraryItems?: unknown[];
  viewModeEnabled?: boolean;
  onChange: (scene: SceneSnapshot) => void;
  onReady?: (api: ExcalidrawImperativeAPI) => void;
}

export function ExcalidrawHost({
  initialScene,
  theme,
  libraryItems,
  viewModeEnabled,
  onChange,
  onReady,
}: ExcalidrawHostProps): JSX.Element {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [key, setKey] = useState(0);

  const initialData = useMemo(() => {
    const base = initialScene ?? { elements: [], appState: {}, files: {} };
    return {
      elements: base.elements,
      appState: {
        ...base.appState,
        theme: theme === "dark" ? THEME.DARK : THEME.LIGHT,
        collaborators: new Map(),
      },
      files: base.files,
      libraryItems: (libraryItems ?? []) as never,
      scrollToContent: true,
    };
  }, [initialScene, theme, libraryItems]);

  useEffect(() => {
    apiRef.current?.updateScene({
      appState: { theme: theme === "dark" ? THEME.DARK : THEME.LIGHT },
    });
  }, [theme]);

  // If a board's initial scene arrives AFTER mount (e.g. route switch), remount.
  useEffect(() => {
    setKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScene]);

  return (
    <Excalidraw
      key={key}
      initialData={initialData}
      theme={theme === "dark" ? THEME.DARK : THEME.LIGHT}
      viewModeEnabled={viewModeEnabled}
      UIOptions={{
        canvasActions: {
          changeViewBackgroundColor: !viewModeEnabled,
          saveToActiveFile: false,
          loadScene: false,
          export: { saveFileToDisk: true },
          toggleTheme: false,
        },
      }}
      onChange={(elements, appState, files) => {
        if (viewModeEnabled) return;
        onChange({ elements, appState, files });
      }}
      excalidrawAPI={(api) => {
        apiRef.current = api;
        onReady?.(api);
      }}
    />
  );
}
