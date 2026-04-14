import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { projectsApi, type Project } from "../api/projects";
import { boardsApi, type BoardSummary } from "../api/boards";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";
import { BoardCard } from "../components/BoardCard";
import "./ProjectView.css";

export function ProjectView(): JSX.Element {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, bs] = await Promise.all([
        projectsApi.get(projectId),
        boardsApi.listForProject(projectId),
      ]);
      setProject(p);
      setBoards(bs);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (): Promise<void> => {
    try {
      const board = await boardsApi.create(projectId);
      setBoards((list) => [board, ...list]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed");
    }
  };

  const handleRename = async (b: BoardSummary): Promise<void> => {
    const name = window.prompt("Rename board", b.name)?.trim();
    if (!name || name === b.name) return;
    try {
      const updated = await boardsApi.update(b.id, { name });
      setBoards((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rename failed");
    }
  };

  const handleFavourite = async (b: BoardSummary): Promise<void> => {
    try {
      const updated = await boardsApi.update(b.id, { isFavorite: !b.is_favorite });
      setBoards((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    }
  };

  const handleDuplicate = async (b: BoardSummary): Promise<void> => {
    try {
      const copy = await boardsApi.duplicate(b.id);
      setBoards((list) => [copy, ...list]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Duplicate failed");
    }
  };

  const handleDelete = async (b: BoardSummary): Promise<void> => {
    if (!window.confirm(`Delete board "${b.name}"?`)) return;
    try {
      await boardsApi.remove(b.id);
      setBoards((list) => list.filter((x) => x.id !== b.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  return (
    <div className="project-view">
      <nav className="project-view__crumbs">
        <Link to="/">Dashboard</Link>
        <span aria-hidden>›</span>
        <span className="project-view__crumbs-current">{project?.name ?? "…"}</span>
      </nav>

      <header className="project-view__head">
        <h1>{project?.name ?? (loading ? "Loading…" : "Project")}</h1>
        <Button variant="primary" size="sm" onClick={() => void handleCreate()}>
          + New board
        </Button>
      </header>

      {error && <div className="project-view__error">{error}</div>}

      {loading ? (
        <p className="project-view__muted">Loading…</p>
      ) : boards.length === 0 ? (
        <div className="project-view__empty">
          <p>No boards yet.</p>
          <Button variant="primary" onClick={() => void handleCreate()}>
            Create the first board
          </Button>
        </div>
      ) : (
        <div className="project-view__grid">
          {boards.map((b) => (
            <BoardCard
              key={b.id}
              board={b}
              onRename={() => void handleRename(b)}
              onToggleFavourite={() => void handleFavourite(b)}
              onDuplicate={() => void handleDuplicate(b)}
              onDelete={() => void handleDelete(b)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
