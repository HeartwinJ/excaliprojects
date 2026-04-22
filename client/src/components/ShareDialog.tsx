import { useCallback, useEffect, useState } from "react";
import { shareApi, type ShareLink } from "../api/share";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { SketchBorder } from "./sketch/SketchBorder";
import "./ShareDialog.css";

interface ShareDialogProps {
  boardId: string;
  open: boolean;
  onClose: () => void;
}

export function ShareDialog({
  boardId,
  open,
  onClose,
}: ShareDialogProps): JSX.Element {
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
      const link = await shareApi.create(
        boardId,
        Number.isFinite(days) ? days : undefined
      );
      setShare(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleRevoke = async (): Promise<void> => {
    if (
      !window.confirm(
        "Revoke the current share link? It will stop working immediately."
      )
    )
      return;
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
    <Modal open={open} onClose={onClose} title="Share board">
      {loading ? (
        <p className="share__muted mono">Loading…</p>
      ) : share ? (
        <div className="share">
          <p className="share__hint">
            Anyone with this link can view the board in read-only mode.
          </p>
          <div className="share__url-row">
            <div className="share__url-wrap sketch-input">
              <SketchBorder
                radius={8}
                stroke="var(--color-line-hi)"
                fill="var(--color-panel-lo)"
                wobble={1.2}
              />
              <input
                className="share__url mono"
                value={share.url}
                readOnly
                aria-label="Share URL"
              />
            </div>
            <Button
              variant="soft"
              size="sm"
              onClick={() => void handleCopy()}
            >
              {copied ? "Copied ✓" : "Copy"}
            </Button>
          </div>
          <div className="share__note">
            <SketchBorder
              radius={9}
              stroke="var(--color-line)"
              fill="var(--color-panel-lo)"
              dashed
              wobble={1.2}
            />
            <div className="share__note-inner">
              <span className="share__note-icon" aria-hidden>
                ◐
              </span>
              Read-only. Viewers can pan and zoom, but cannot edit.
            </div>
          </div>
          <div className="share__footer">
            <span className="share__meta mono">
              Created{" "}
              {new Date(share.created_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              {share.expires_at &&
                ` · expires ${new Date(share.expires_at).toLocaleDateString()}`}
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={() => void handleRevoke()}
            >
              Revoke
            </Button>
          </div>
        </div>
      ) : (
        <div className="share">
          <p className="share__hint">
            No active share link. Create one to let others view this board —
            they won't need an account.
          </p>
          <label className="share__field">
            <span>Expires in (days, optional)</span>
            <div className="share__field-wrap sketch-input">
              <SketchBorder
                radius={9}
                stroke="var(--color-line-hi)"
                fill="var(--color-panel-lo)"
                wobble={1.2}
              />
              <input
                type="number"
                min={1}
                placeholder="Never"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                className="share__field-input"
              />
            </div>
          </label>
          <div className="share__footer">
            <span className="share__meta mono">Shareable · not searchable</span>
            <Button variant="primary" onClick={() => void handleCreate()}>
              Create link
            </Button>
          </div>
        </div>
      )}
      {error && <div className="share__error mono">{error}</div>}
    </Modal>
  );
}
