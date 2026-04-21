import { useCallback, useEffect, useRef, useState } from "react";
import { librariesApi, type LibrarySummary } from "../api/libraries";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";
import { GridBackdrop } from "../components/sketch/GridBackdrop";
import { SketchBorder } from "../components/sketch/SketchBorder";
import { SketchCard } from "../components/sketch/SketchCard";
import "./LibrariesPage.css";

const SWATCHES = [
  "var(--color-accent)",
  "var(--color-amber)",
  "var(--color-mint)",
  "var(--color-rose)",
];

function swatchFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return SWATCHES[Math.abs(h) % SWATCHES.length]!;
}

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
          <div className="libraries__grid">
            {libs.map((l) => (
              <LibraryCard
                key={l.id}
                name={l.name}
                addedAt={l.created_at}
                swatch={swatchFor(l.name)}
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
  name,
  addedAt,
  swatch,
  onDelete,
}: {
  name: string;
  addedAt: string;
  swatch: string;
  onDelete: () => void;
}): JSX.Element {
  const added = new Date(addedAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <SketchCard
      radius={14}
      wobble={1.4}
      seed={name.length}
      fill="var(--color-panel)"
      style={{ padding: 18 }}
    >
      <div className="libraries__card-head">
        <div>
          <div
            className="libraries__card-title"
            style={{ color: "var(--color-text)" }}
          >
            {name}
          </div>
          <div className="libraries__card-meta mono">added {added}</div>
        </div>
        <button
          type="button"
          className="libraries__card-action"
          onClick={onDelete}
          aria-label={`Delete ${name}`}
        >
          Delete
        </button>
      </div>
      <div className="libraries__card-shapes" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <ShapeSlot key={i} index={i} stroke={swatch} />
        ))}
      </div>
    </SketchCard>
  );
}

function ShapeSlot({
  index,
  stroke,
}: {
  index: number;
  stroke: string;
}): JSX.Element {
  return (
    <div className="libraries__shape">
      <SketchBorder
        radius={6}
        stroke="var(--color-line)"
        fill="var(--color-panel-lo)"
        wobble={1.1}
      />
      <svg viewBox="0 0 32 32" width={22} height={22}>
        <g fill="none" stroke={stroke} strokeWidth={1.3} strokeLinecap="round">
          {index === 0 && <rect x={6} y={8} width={20} height={16} rx={2} />}
          {index === 1 && <circle cx={16} cy={16} r={9} />}
          {index === 2 && <path d="M16,5 L27,16 L16,27 L5,16 Z" />}
          {index === 3 && <path d="M6,22 L14,12 L20,18 L26,8" />}
          {index === 4 && <path d="M6,16 L22,16 M18,12 L22,16 L18,20" />}
          {index === 5 && (
            <path d="M10,10 L22,10 M10,16 L22,16 M10,22 L18,22" />
          )}
        </g>
      </svg>
    </div>
  );
}
