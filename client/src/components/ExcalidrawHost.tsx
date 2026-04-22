import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import type { LibraryItems } from "@excalidraw/excalidraw/types/types";
import { Excalidraw, MainMenu, THEME } from "@excalidraw/excalidraw";

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
  menu?: ReactNode;
  onChange: (scene: SceneSnapshot) => void;
  onReady?: (api: ExcalidrawImperativeAPI) => void;
}

export function ExcalidrawHost({
  initialScene,
  theme,
  libraryItems,
  viewModeEnabled,
  menu,
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

  // Push library items imperatively when they arrive / change after mount.
  // `initialData.libraryItems` is only read on the first mount, so without
  // this the library panel stays empty if the fetch resolves late.
  useEffect(() => {
    const api = apiRef.current;
    if (!api || !libraryItems || libraryItems.length === 0) return;
    void api.updateLibrary({
      libraryItems: libraryItems as LibraryItems,
      merge: false,
      openLibraryMenu: false,
    });
  }, [libraryItems]);

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
        if (libraryItems && libraryItems.length > 0) {
          void api.updateLibrary({
            libraryItems: libraryItems as LibraryItems,
            merge: false,
            openLibraryMenu: false,
          });
        }
        onReady?.(api);
      }}
    >
      {menu != null ? <MainMenu>{menu}</MainMenu> : null}
    </Excalidraw>
  );
}
