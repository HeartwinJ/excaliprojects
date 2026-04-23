import { useCallback, useEffect, useRef, useState } from "react";
import { exportToSvg } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import {
  librariesApi,
  type LibraryItem,
  type LibrarySummary,
} from "../api/libraries";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";
import { GridBackdrop } from "../components/sketch/GridBackdrop";
import { SketchBorder } from "../components/sketch/SketchBorder";
import { SketchCard } from "../components/sketch/SketchCard";
import "./LibrariesPage.css";

export function LibrariesPage(): JSX.Element {
  const [libs, setLibs] = useState<LibrarySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLibs(await librariesApi.list());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (file: File): Promise<void> => {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("Not a valid JSON file.");
      return;
    }
    if (!parsed || typeof parsed !== "object") {
      setError("Library file must be a JSON object.");
      return;
    }
    const name = file.name.replace(/\.excalidrawlib$|\.json$/i, "") || "Library";
    try {
      const lib = await librariesApi.upload({
        name,
        data: parsed as Record<string, unknown>,
      });
      setLibs((list) => [...list, lib]);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    }
  };

  const handleDelete = async (l: LibrarySummary): Promise<void> => {
    if (!window.confirm(`Delete library "${l.name}"?`)) return;
    try {
      await librariesApi.remove(l.id);
      setLibs((list) => list.filter((x) => x.id !== l.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  return (
    <div className="libraries">
      <GridBackdrop opacity={0.03} size={32} />
      <div className="libraries__inner">
        <header className="libraries__head">
          <div>
            <h1>Libraries</h1>
            <p className="libraries__hint">
              Reusable shapes, icons, and stencils you can drop into any board.
              Every item here is available in the editor's Library panel.
            </p>
          </div>
          <div>
            <input
              ref={fileInput}
              type="file"
              accept=".excalidrawlib,application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="soft"
              size="sm"
              icon={<span aria-hidden>+</span>}
              onClick={() => fileInput.current?.click()}
            >
              Add .excalidrawlib…
            </Button>
          </div>
        </header>

        {error && <div className="libraries__error mono">{error}</div>}

        {loading ? (
          <p className="libraries__muted mono">Loading…</p>
        ) : libs.length === 0 ? (
          <div className="libraries__empty">
            <SketchBorder
              radius={14}
              stroke="var(--color-line)"
              fill="var(--color-panel-lo)"
              dashed
              wobble={1.4}
            />
            <div className="libraries__empty-inner">
              <div className="libraries__empty-title">No libraries yet</div>
              <div className="libraries__empty-sub mono">
                Upload an .excalidrawlib file to make shapes available in every
                board.
              </div>
            </div>
          </div>
        ) : (
          <div className="libraries__list">
            {libs.map((l) => (
              <LibraryCard
                key={l.id}
                library={l}
                onDelete={() => void handleDelete(l)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LibraryCard({
  library,
  onDelete,
}: {
  library: LibrarySummary;
  onDelete: () => void;
}): JSX.Element {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItemsError(null);
    void librariesApi
      .itemsFor(library.id)
      .then((loaded) => {
        if (!cancelled) setItems(loaded);
      })
      .catch((err) => {
        if (cancelled) return;
        setItemsError(
          err instanceof ApiError ? err.message : "Failed to load items"
        );
      });
    return () => {
      cancelled = true;
    };
  }, [library.id]);

  const added = new Date(library.created_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const count = items?.length;

  return (
    <SketchCard
      radius={14}
      wobble={1.4}
      seed={library.name.length}
      fill="var(--color-panel)"
      style={{ padding: 18 }}
    >
      <div className="libraries__card-head">
        <div>
          <div className="libraries__card-title">{library.name}</div>
          <div className="libraries__card-meta mono">
            {count !== undefined && (
              <>
                {count} component{count === 1 ? "" : "s"} · added {added}
              </>
            )}
            {count === undefined && <>added {added}</>}
          </div>
        </div>
        <button
          type="button"
          className="libraries__card-action"
          onClick={onDelete}
          aria-label={`Delete ${library.name}`}
        >
          Delete
        </button>
      </div>

      {itemsError && <div className="libraries__error mono">{itemsError}</div>}

      {items === null && !itemsError && (
        <div className="libraries__card-loading mono">Loading components…</div>
      )}

      {items && items.length === 0 && (
        <div className="libraries__card-loading mono">
          This library has no components.
        </div>
      )}

      {items && items.length > 0 && (
        <div className="libraries__shapes">
          {items.map((item) => (
            <LibraryItemPreview key={item.id} item={item} />
          ))}
        </div>
      )}
    </SketchCard>
  );
}

function LibraryItemPreview({ item }: { item: LibraryItem }): JSX.Element {
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
          exportPadding: 8,
        });
        if (cancelled) return;
        // Let the parent control sizing; the exportToSvg output carries its
        // own width/height attributes that we strip so the SVG scales.
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute(
          "style",
          "width:100%;height:100%;display:block;"
        );
        holder.appendChild(svg);
      } catch (err) {
        if (cancelled) return;
        console.warn("library item preview failed", err);
        holder.innerHTML = "";
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item]);

  return (
    <div
      className="libraries__shape"
      title={item.name ?? "Library item"}
    >
      <SketchBorder
        radius={6}
        stroke="var(--color-line)"
        fill="var(--color-panel-lo)"
        wobble={1.1}
      />
      <div ref={holderRef} className="libraries__shape-canvas" />
      {item.name && <div className="libraries__shape-label">{item.name}</div>}
    </div>
  );
}
