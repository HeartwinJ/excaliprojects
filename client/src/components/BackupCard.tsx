import { useRef, useState } from "react";
import { backupApi } from "../api/backup";
import { Button } from "./Button";
import "./BackupCard.css";

export function BackupCard(): JSX.Element {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleRestore = async (file: File): Promise<void> => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = await backupApi.restore(parsed);
      setMessage(
        `Imported ${result.created.projects} project(s), ${result.created.boards} board(s), ${result.created.libraries} library(ies).`
      );
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="backup">
      <h2>Backup &amp; restore</h2>
      <p className="backup__hint">
        Export everything (projects, boards, tags, checkpoints, libraries) as a JSON file, or
        restore from one. Thumbnails will regenerate on next edit.
      </p>
      <div className="backup__actions">
        <a
          className="btn btn--secondary btn--md"
          href={backupApi.downloadUrl}
          download
        >
          Export all
        </a>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleRestore(file);
            e.target.value = "";
          }}
        />
        <Button onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? "Restoring…" : "Restore from JSON…"}
        </Button>
      </div>
      {message && <div className="backup__ok">{message}</div>}
      {error && <div className="backup__error">{error}</div>}
    </section>
  );
}
