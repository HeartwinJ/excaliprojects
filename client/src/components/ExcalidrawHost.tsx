import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { LibraryItems } from "@excalidraw/excalidraw/types";
import { Excalidraw, MainMenu, Sidebar, THEME } from "@excalidraw/excalidraw";
import { LibraryGroupSidebar } from "./LibraryGroupSidebar";

export interface SceneSnapshot {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

/** Imperative handle exposed to parent components. */
export interface ExcalidrawHostHandle {
  toggleComponentSidebar: () => void;
}

interface ExcalidrawHostProps {
  initialScene: SceneSnapshot | null;
  theme: "light" | "dark";
  libraryItems?: unknown[];
  viewModeEnabled?: boolean;
  menu?: ReactNode;
  /**
   * When true, mounts an extra "Components" sidebar with per-library groups.
   * Not wanted on the public read-only share view.
   */
  componentSidebarEnabled?: boolean;
  /**
   * Bumped by parent whenever libraries may have changed (upload/delete)
   * so the component sidebar can re-fetch its groups.
   */
  librariesToken?: number;
  onChange: (scene: SceneSnapshot) => void;
  onReady?: (api: ExcalidrawImperativeAPI) => void;
}

export const COMPONENT_SIDEBAR_NAME = "excaliprojects-components";

const DOCKED_PREF_KEY = "excaliprojects.components-sidebar-docked";

function readDockedPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DOCKED_PREF_KEY) === "true";
  } catch {
    return false;
  }
}

export const ExcalidrawHost = forwardRef<
  ExcalidrawHostHandle,
  ExcalidrawHostProps
>(function ExcalidrawHost(
  {
    initialScene,
    theme,
    libraryItems,
    viewModeEnabled,
    menu,
    componentSidebarEnabled = false,
    librariesToken,
    onChange,
    onReady,
  },
  ref
) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [key, setKey] = useState(0);
  const [sidebarDocked, setSidebarDocked] = useState<boolean>(readDockedPref);

  useEffect(() => {
    try {
      window.localStorage.setItem(DOCKED_PREF_KEY, String(sidebarDocked));
    } catch {
      /* quota / private mode — ignore */
    }
  }, [sidebarDocked]);

  useImperativeHandle(
    ref,
    () => ({
      toggleComponentSidebar: () => {
        apiRef.current?.toggleSidebar({ name: COMPONENT_SIDEBAR_NAME });
      },
    }),
    []
  );

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
      {componentSidebarEnabled && (
        <Sidebar
          name={COMPONENT_SIDEBAR_NAME}
          docked={sidebarDocked}
          onDock={(next) => setSidebarDocked(next)}
        >
          <Sidebar.Header>
            <span className="libsidebar__title">Components</span>
          </Sidebar.Header>
          <LibraryGroupSidebar
            apiRef={apiRef}
            refreshToken={librariesToken}
            theme={theme}
          />
        </Sidebar>
      )}
    </Excalidraw>
  );
});
