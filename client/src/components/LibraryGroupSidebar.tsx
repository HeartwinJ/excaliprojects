import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  exportToSvg,
  viewportCoordsToSceneCoords,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import {
  librariesApi,
  type LibraryItem,
  type LibrarySummary,
} from "../api/libraries";
import { ApiError } from "../api/client";
import "./LibraryGroupSidebar.css";

interface LibraryGroup {
  library: LibrarySummary;
  items: LibraryItem[];
  error?: string;
}

interface Props {
  apiRef: React.MutableRefObject<ExcalidrawImperativeAPI | null>;
  /**
   * Bumped whenever the user uploads or deletes a library from elsewhere in
   * the app — so this sidebar can re-fetch.
   */
  refreshToken?: number;
}

/** Content for the custom Library sidebar. Grouped by source library. */
export function LibraryGroupSidebar({ apiRef, refreshToken }: Props): JSX.Element {
  const [groups, setGroups] = useState<LibraryGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  // Fetch all libraries and each library's items in parallel.
  useEffect(() => {
    let cancelled = false;
    setGroups(null);
    setError(null);
    (async () => {
      try {
        const libs = await librariesApi.list();
        const withItems = await Promise.all(
          libs.map(async (lib) => {
            try {
              const items = await librariesApi.itemsFor(lib.id);
              return { library: lib, items };
            } catch (err) {
              return {
                library: lib,
                items: [],
                error:
                  err instanceof ApiError
                    ? err.message
                    : "Failed to load items",
              };
            }
          })
        );
        if (!cancelled) setGroups(withItems);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const handleInsert = useCallback(
    (item: LibraryItem) => {
      const api = apiRef.current;
      if (!api) return;
      const appState = api.getAppState();
      // Centre of the viewport in scene coordinates.
      const center = viewportCoordsToSceneCoords(
        {
          clientX: appState.width / 2 + appState.offsetLeft,
          clientY: appState.height / 2 + appState.offsetTop,
        },
        appState
      );
      const cloned = cloneLibraryItemElements(
        item.elements as ExcalidrawElement[],
        center.x,
        center.y
      );
      if (cloned.length === 0) return;
      const current = api.getSceneElementsIncludingDeleted();
      api.updateScene({
        elements: [...current, ...cloned],
        appState: {
          selectedElementIds: cloned.reduce<Record<string, true>>((acc, el) => {
            acc[el.id] = true;
            return acc;
          }, {}),
        },
      });
    },
    [apiRef]
  );

  const filteredGroups = useMemo(() => {
    if (!groups) return null;
    const q = query.trim().toLowerCase();
    if (q.length === 0) return groups;
    return groups
      .map((g) => {
        if (g.library.name.toLowerCase().includes(q)) return g;
        const items = g.items.filter((item) =>
          (item.name ?? "").toLowerCase().includes(q)
        );
        return { ...g, items };
      })
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  return (
    <div className="libsidebar">
      <div className="libsidebar__search">
        <input
          type="search"
          placeholder="Search components…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search components"
        />
      </div>

      {error && <div className="libsidebar__error mono">{error}</div>}

      {groups === null && !error && (
        <p className="libsidebar__muted mono">Loading libraries…</p>
      )}

      {groups && groups.length === 0 && (
        <div className="libsidebar__empty">
          <p className="mono">No libraries uploaded yet.</p>
          <p className="mono libsidebar__muted">
            Head to <span className="libsidebar__hint">Libraries</span> to
            upload a <code>.excalidrawlib</code>.
          </p>
        </div>
      )}

      {filteredGroups && filteredGroups.length === 0 && query && (
        <p className="libsidebar__muted mono">
          No components match "{query}".
        </p>
      )}

      {filteredGroups?.map((group) => {
        const isCollapsed = collapsed[group.library.id] === true;
        return (
          <section
            key={group.library.id}
            className={`libsidebar__group${
              isCollapsed ? " is-collapsed" : ""
            }`}
          >
            <header
              className="libsidebar__group-head"
              onClick={() =>
                setCollapsed((c) => ({
                  ...c,
                  [group.library.id]: !isCollapsed,
                }))
              }
              role="button"
              aria-expanded={!isCollapsed}
            >
              <span className="libsidebar__group-chev" aria-hidden>
                {isCollapsed ? "▸" : "▾"}
              </span>
              <span className="libsidebar__group-name">
                {group.library.name}
              </span>
              <span className="libsidebar__group-count mono">
                {group.items.length}
              </span>
            </header>
            {!isCollapsed && (
              <div className="libsidebar__grid">
                {group.error && (
                  <div className="libsidebar__error mono">{group.error}</div>
                )}
                {group.items.map((item) => (
                  <LibraryItemTile
                    key={item.id}
                    item={item}
                    onInsert={handleInsert}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function LibraryItemTile({
  item,
  onInsert,
}: {
  item: LibraryItem;
  onInsert: (item: LibraryItem) => void;
}): JSX.Element {
  const holderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const holder = holderRef.current;
    if (!holder) return;
    holder.innerHTML = "";
    (async () => {
      try {
        const svg = await exportToSvg({
          elements: item.elements as readonly ExcalidrawElement[],
          appState: {
            exportBackground: false,
            exportWithDarkMode: false,
            viewBackgroundColor: "transparent",
          },
          files: {},
          exportPadding: 6,
        });
        if (cancelled) return;
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("style", "width:100%;height:100%;display:block;");
        holder.appendChild(svg);
      } catch {
        if (!cancelled && holder) holder.innerHTML = "";
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item]);

  const onClick = (e: MouseEvent): void => {
    e.preventDefault();
    onInsert(item);
  };

  return (
    <button
      type="button"
      className="libsidebar__tile"
      onClick={onClick}
      title={item.name ?? "Library item"}
    >
      <div ref={holderRef} className="libsidebar__tile-canvas" />
      {item.name && <span className="libsidebar__tile-label">{item.name}</span>}
    </button>
  );
}

// ————————————————————————————————————————————————————————————————
// Element cloning — generate fresh IDs and offset so the item lands
// centred at the supplied scene coordinates.

function randomId(): string {
  // `crypto.randomUUID` is available in modern browsers; fall back to a
  // Math.random shim just in case.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function cloneLibraryItemElements(
  elements: ExcalidrawElement[],
  centreSceneX: number,
  centreSceneY: number
): ExcalidrawElement[] {
  if (elements.length === 0) return [];

  // Compute bounding box of the item's elements (in their own coords).
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const dx = centreSceneX - midX;
  const dy = centreSceneY - midY;

  // Map every element id and every group id to a fresh one so repeated
  // inserts don't collide.
  const elementIdMap = new Map<string, string>();
  const groupIdMap = new Map<string, string>();
  for (const el of elements) {
    elementIdMap.set(el.id, randomId());
    for (const gid of el.groupIds ?? []) {
      if (!groupIdMap.has(gid)) groupIdMap.set(gid, randomId());
    }
  }

  const remap = (id: string): string => elementIdMap.get(id) ?? id;

  return elements.map((el) => {
    // structuredClone produces a mutable copy; Excalidraw's element types
    // mark fields readonly so we widen via `Record<string, unknown>` for
    // the rewrites.
    const base = structuredClone(el) as Record<string, unknown>;
    base.id = elementIdMap.get(el.id)!;
    base.x = el.x + dx;
    base.y = el.y + dy;
    base.groupIds = (el.groupIds ?? []).map(
      (gid) => groupIdMap.get(gid) ?? gid
    );
    const boundElements = (base.boundElements as
      | Array<{ id: string; type: string }>
      | null
      | undefined);
    if (boundElements && Array.isArray(boundElements)) {
      base.boundElements = boundElements.map((b) => ({
        ...b,
        id: remap(b.id),
      }));
    }
    if (typeof base.containerId === "string" && base.containerId) {
      base.containerId = remap(base.containerId);
    }
    const startBinding = base.startBinding as
      | (Record<string, unknown> & { elementId?: string })
      | undefined;
    if (startBinding && typeof startBinding.elementId === "string") {
      base.startBinding = {
        ...startBinding,
        elementId: remap(startBinding.elementId),
      };
    }
    const endBinding = base.endBinding as
      | (Record<string, unknown> & { elementId?: string })
      | undefined;
    if (endBinding && typeof endBinding.elementId === "string") {
      base.endBinding = {
        ...endBinding,
        elementId: remap(endBinding.elementId),
      };
    }
    // Bump version so Excalidraw treats it as a new element.
    const prevVersion =
      typeof (el as { version?: number }).version === "number"
        ? (el as { version: number }).version
        : 1;
    base.version = prevVersion + 1;
    base.versionNonce = Math.floor(Math.random() * 2 ** 31);
    base.seed = Math.floor(Math.random() * 2 ** 31);
    base.updated = Date.now();
    return base as unknown as ExcalidrawElement;
  });
}
