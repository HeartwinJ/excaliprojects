import { useEffect, useState, type KeyboardEvent } from "react";
import { tagsApi, type Tag } from "../api/tags";
import "./TagEditor.css";

interface TagEditorProps {
  boardId: string;
}

export function TagEditor({ boardId }: TagEditorProps): JSX.Element {
  const [tags, setTags] = useState<Tag[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void tagsApi.listForBoard(boardId).then((t) => {
      if (!cancelled) setTags(t);
    });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  const commit = async (next: string[]): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const updated = await tagsApi.setForBoard(boardId, next);
      setTags(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const addTag = (name: string): void => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) return;
    const next = [...tags.map((t) => t.name), trimmed];
    void commit(next);
    setDraft("");
  };

  const removeTag = (name: string): void => {
    const next = tags.filter((t) => t.name !== name).map((t) => t.name);
    void commit(next);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]!.name);
    }
  };

  return (
    <div className="tag-editor">
      {tags.map((t) => (
        <span key={t.id} className="tag-editor__chip">
          {t.name}
          <button
            type="button"
            aria-label={`Remove ${t.name}`}
            onClick={() => removeTag(t.name)}
          >
            ✕
          </button>
        </span>
      ))}
      <input
        className="tag-editor__input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(draft)}
        placeholder={saving ? "Saving…" : "+ Add tag"}
        disabled={saving}
      />
      {error && <span className="tag-editor__error">{error}</span>}
    </div>
  );
}
