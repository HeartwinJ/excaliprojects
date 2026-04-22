import { useEffect, useState, type KeyboardEvent } from "react";
import { tagsApi, type Tag as TagRecord } from "../api/tags";
import "./TagEditor.css";

interface TagEditorProps {
  /** Either a board or a project. */
  kind?: "board" | "project";
  /** The target id — defaults to treating it as a board for back-compat. */
  boardId?: string;
  projectId?: string;
  /** Optional list of initial tags to seed without a fetch. */
  initial?: TagRecord[];
  /** Called with the new tag list after each save. */
  onChange?: (tags: TagRecord[]) => void;
}

export function TagEditor({
  kind,
  boardId,
  projectId,
  initial,
  onChange,
}: TagEditorProps): JSX.Element {
  const effectiveKind: "board" | "project" =
    kind ?? (projectId ? "project" : "board");
  const targetId = effectiveKind === "project" ? projectId! : boardId!;

  const [tags, setTags] = useState<TagRecord[]>(initial ?? []);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    const fetcher =
      effectiveKind === "project"
        ? tagsApi.listForProject(targetId)
        : tagsApi.listForBoard(targetId);
    void fetcher.then((t) => {
      if (!cancelled) setTags(t);
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveKind, targetId, initial]);

  const commit = async (next: string[]): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const updated =
        effectiveKind === "project"
          ? await tagsApi.setForProject(targetId, next)
          : await tagsApi.setForBoard(targetId, next);
      setTags(updated);
      onChange?.(updated);
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
        <span key={t.id} className="pill tag-editor__chip">
          #{t.name}
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
        className="tag-editor__input mono"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(draft)}
        placeholder={saving ? "Saving…" : "+ add tag"}
        disabled={saving}
      />
      {error && <span className="tag-editor__error mono">{error}</span>}
    </div>
  );
}
