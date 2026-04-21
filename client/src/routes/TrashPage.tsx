import { useCallback, useEffect, useState } from "react";
import { trashApi, type TrashItem } from "../api/trash";
import { ApiError } from "../api/client";
import { GridBackdrop } from "../components/sketch/GridBackdrop";
import { SketchCard } from "../components/sketch/SketchCard";
import "./TrashPage.css";

const RETENTION_DAYS = 30;

function daysLeft(deletedAt: string): number {
  const deleted = new Date(deletedAt).getTime();
  const elapsed = (Date.now() - deleted) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(RETENTION_DAYS - elapsed));
}

function fmtDeleted(iso: string): string {
  const d = new Date(iso);
  const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 7) return `${Math.floor(days)} days ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function TrashPage(): JSX.Element {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await trashApi.list());
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

  const handleRestore = async (item: TrashItem): Promise<void> => {
    try {
      await trashApi.restore(item.kind, item.id);
      setItems((list) =>
        list.filter((x) => !(x.kind === item.kind && x.id === item.id))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Restore failed");
    }
  };

  const handleDelete = async (item: TrashItem): Promise<void> => {
    if (
      !window.confirm(
        `Permanently delete "${item.name}"? This cannot be undone.`
      )
    )
      return;
    try {
      await trashApi.remove(item.kind, item.id);
      setItems((list) =>
        list.filter((x) => !(x.kind === item.kind && x.id === item.id))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  const handleEmpty = async (): Promise<void> => {
    if (items.length === 0) return;
    if (!window.confirm("Permanently delete every item in trash?")) return;
    for (const item of items) {
      try {
        await trashApi.remove(item.kind, item.id);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Delete failed");
        break;
      }
    }
    await load();
  };

  return (
    <div className="trash">
      <GridBackdrop opacity={0.03} size={32} />
      <div className="trash__inner">
        <header className="trash__head">
          <h1>Trash</h1>
          <p className="trash__hint">
            Items are deleted forever after {RETENTION_DAYS} days.{" "}
            {items.length > 0 && (
              <button
                type="button"
                className="trash__empty"
                onClick={() => void handleEmpty()}
              >
                Empty now
              </button>
            )}
          </p>
        </header>

        {error && <div className="trash__error mono">{error}</div>}

        {loading ? (
          <p className="trash__muted mono">Loading…</p>
        ) : items.length === 0 ? (
          <p className="trash__muted mono">Nothing in trash.</p>
        ) : (
          <SketchCard
            radius={12}
            wobble={1.3}
            fill="var(--color-panel-lo)"
            style={{ overflow: "hidden" }}
          >
            {items.map((item, idx) => {
              const canRestore =
                item.kind === "project" ||
                (item.kind === "board" && item.project_deleted_at === null);
              const left = daysLeft(item.deleted_at);
              return (
                <TrashRow
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  canRestore={canRestore}
                  daysLeft={left}
                  last={idx === items.length - 1}
                  onRestore={() => void handleRestore(item)}
                  onDelete={() => void handleDelete(item)}
                />
              );
            })}
          </SketchCard>
        )}
      </div>
    </div>
  );
}

function TrashRow({
  item,
  canRestore,
  daysLeft,
  last,
  onRestore,
  onDelete,
}: {
  item: TrashItem;
  canRestore: boolean;
  daysLeft: number;
  last: boolean;
  onRestore: () => void;
  onDelete: () => void;
}): JSX.Element {
  const kindLabel = item.kind === "project" ? "project" : "board";
  const warn = daysLeft <= 7;
  return (
    <div className={`trash__row${last ? " trash__row--last" : ""}`}>
      <span className={`trash__kind trash__kind--${item.kind}`}>
        {kindLabel}
      </span>
      <span className="trash__name">{item.name}</span>
      {item.kind === "board" && (
        <span className="trash__parent mono">in {item.project_name}</span>
      )}
      <span className="trash__time mono">
        deleted {fmtDeleted(item.deleted_at)}
      </span>
      <span
        className={`trash__expires mono${
          warn ? " trash__expires--warn" : ""
        }`}
      >
        {daysLeft}d
      </span>
      <div className="trash__row-actions">
        <button
          type="button"
          className="trash__action trash__action--restore"
          onClick={onRestore}
          disabled={!canRestore}
          title={canRestore ? undefined : "Restore the parent project first"}
        >
          Restore
        </button>
        <button
          type="button"
          className="trash__action trash__action--delete"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
