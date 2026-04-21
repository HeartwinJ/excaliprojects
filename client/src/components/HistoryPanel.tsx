import { useCallback, useEffect, useState } from "react";
import { versionsApi, type VersionSummary } from "../api/versions";
import { Button } from "./Button";
import { Modal } from "./Modal";
import "./HistoryPanel.css";

interface HistoryPanelProps {
  boardId: string;
  open: boolean;
  onClose: () => void;
  onRestore: () => void;
}

export function HistoryPanel({
  boardId,
  open,
  onClose,
  onRestore,
}: HistoryPanelProps): JSX.Element {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVersions(await versionsApi.list(boardId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const handleCheckpoint = async (): Promise<void> => {
    setBusy(true);
    try {
      await versionsApi.checkpoint(boardId, label.trim() || undefined);
      setLabel("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkpoint failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (id: string): Promise<void> => {
    if (!window.confirm("Restore this snapshot? Your current scene will be replaced.")) return;
    setBusy(true);
    try {
      await versionsApi.restore(id);
      onRestore();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm("Delete this checkpoint?")) return;
    try {
      await versionsApi.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Version history">
      <div className="history">
        <div className="history__create">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Checkpoint label (optional)"
          />
          <Button variant="primary" onClick={() => void handleCheckpoint()} disabled={busy}>
            + Create checkpoint
          </Button>
        </div>

        {error && <div className="history__error">{error}</div>}

        {loading ? (
          <p className="history__muted">Loading…</p>
        ) : versions.length === 0 ? (
          <p className="history__muted">No snapshots yet.</p>
        ) : (
          <ul className="history__list">
            {versions.map((v) => (
              <li key={v.id} className="history__item">
                <div className="history__item-main">
                  <span className={`history__badge history__badge--${v.is_checkpoint ? "check" : "auto"}`}>
                    {v.is_checkpoint ? "★ Checkpoint" : "Auto"}
                  </span>
                  <span className="history__label">
                    {v.label ?? new Date(v.created_at).toLocaleString()}
                  </span>
                  {v.label && (
                    <span className="history__time">
                      {new Date(v.created_at).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="history__item-actions">
                  <Button size="sm" onClick={() => void handleRestore(v.id)} disabled={busy}>
                    Restore
                  </Button>
                  {v.is_checkpoint && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleDelete(v.id)}
                      disabled={busy}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
