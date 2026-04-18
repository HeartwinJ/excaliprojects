import { useCallback, useEffect, useState } from "react";
import { trashApi, type TrashItem } from "../api/trash";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";
import "./TrashPage.css";

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
      setItems((list) => list.filter((x) => !(x.kind === item.kind && x.id === item.id)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Restore failed");
    }
  };

  const handleDelete = async (item: TrashItem): Promise<void> => {
    if (!window.confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await trashApi.remove(item.kind, item.id);
      setItems((list) => list.filter((x) => !(x.kind === item.kind && x.id === item.id)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  return (
    <div className="trash">
      <header className="trash__head">
        <h1>Trash</h1>
      </header>

      <p className="trash__hint">
        Deleted projects and boards stay here for 30 days before being permanently removed.
      </p>

      {error && <div className="trash__error">{error}</div>}

      {loading ? (
        <p className="trash__muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="trash__muted">Nothing in trash.</p>
      ) : (
        <ul className="trash__list">
          {items.map((item) => {
            const canRestore =
              item.kind === "project" ||
              (item.kind === "board" && item.project_deleted_at === null);
            return (
              <li key={`${item.kind}-${item.id}`} className="trash__item">
                <div className="trash__info">
                  <span className={`trash__kind trash__kind--${item.kind}`}>
                    {item.kind === "project" ? "Project" : "Board"}
                  </span>
                  <strong>{item.name}</strong>
                  {item.kind === "board" && (
                    <span className="trash__muted">in {item.project_name}</span>
                  )}
                  <span className="trash__time">
                    deleted {new Date(item.deleted_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="trash__actions">
                  <Button
                    size="sm"
                    onClick={() => void handleRestore(item)}
                    disabled={!canRestore}
                    title={canRestore ? undefined : "Restore the parent project first"}
                  >
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => void handleDelete(item)}
                  >
                    Delete forever
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
