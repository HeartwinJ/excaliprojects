import { useCallback, useEffect, useRef, useState } from "react";
import { librariesApi, type LibrarySummary } from "../api/libraries";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";
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
      const lib = await librariesApi.upload({ name, data: parsed as Record<string, unknown> });
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
      <header className="libraries__head">
        <h1>Libraries</h1>
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
          <Button variant="primary" size="sm" onClick={() => fileInput.current?.click()}>
            + Upload .excalidrawlib
          </Button>
        </div>
      </header>

      <p className="libraries__hint">
        Libraries you upload here appear in the library panel inside every board.
      </p>

      {error && <div className="libraries__error">{error}</div>}

      {loading ? (
        <p className="libraries__muted">Loading…</p>
      ) : libs.length === 0 ? (
        <p className="libraries__muted">No libraries yet. Upload an .excalidrawlib file to start.</p>
      ) : (
        <ul className="libraries__list">
          {libs.map((l) => (
            <li key={l.id} className="libraries__item">
              <div>
                <strong>{l.name}</strong>
                <span className="libraries__muted">
                  added {new Date(l.created_at).toLocaleDateString()}
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => void handleDelete(l)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
