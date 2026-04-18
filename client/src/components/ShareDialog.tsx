import { useCallback, useEffect, useState } from "react";
import { shareApi, type ShareLink } from "../api/share";
import { Button } from "./Button";
import { Modal } from "./Modal";
import "./ShareDialog.css";

interface ShareDialogProps {
  boardId: string;
  open: boolean;
  onClose: () => void;
}

export function ShareDialog({ boardId, open, onClose }: ShareDialogProps): JSX.Element {
  const [share, setShare] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setShare(await shareApi.get(boardId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const handleCreate = async (): Promise<void> => {
    setError(null);
    try {
      const days = expiresInDays.trim() ? Number(expiresInDays.trim()) : undefined;
      const link = await shareApi.create(boardId, Number.isFinite(days) ? days : undefined);
      setShare(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleRevoke = async (): Promise<void> => {
    if (!window.confirm("Revoke the current share link? It will stop working immediately.")) return;
    try {
      await shareApi.revoke(boardId);
      setShare(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share this board">
      {loading ? (
        <p>Loading…</p>
      ) : share ? (
        <div className="share">
          <p className="share__hint">
            Anyone with this link can view the board in read-only mode.
          </p>
          <div className="share__url">
            <input value={share.url} readOnly />
            <Button variant="primary" size="sm" onClick={() => void handleCopy()}>
              {copied ? "Copied ✓" : "Copy"}
            </Button>
          </div>
          <p className="share__meta">
            Created {new Date(share.created_at).toLocaleString()}
            {share.expires_at && ` · expires ${new Date(share.expires_at).toLocaleDateString()}`}
          </p>
          <div>
            <Button variant="danger" size="sm" onClick={() => void handleRevoke()}>
              Revoke
            </Button>
          </div>
        </div>
      ) : (
        <div className="share">
          <p className="share__hint">
            No active share link. Create one to let others view this board.
          </p>
          <label className="share__field">
            <span>Expires in (days, optional)</span>
            <input
              type="number"
              min={1}
              placeholder="Never"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
            />
          </label>
          <Button variant="primary" onClick={() => void handleCreate()}>
            Create share link
          </Button>
        </div>
      )}
      {error && <div className="share__error">{error}</div>}
    </Modal>
  );
}
