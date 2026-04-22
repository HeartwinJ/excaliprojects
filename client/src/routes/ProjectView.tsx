import { useCallback, useEffect, useState, type DragEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { projectsApi, type Project } from "../api/projects";
import { boardsApi, type BoardSummary } from "../api/boards";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";
import { BoardCard } from "../components/BoardCard";
import { TagEditor } from "../components/TagEditor";
import { GridBackdrop } from "../components/sketch/GridBackdrop";
import { SketchBorder } from "../components/sketch/SketchBorder";
import "./ProjectView.css";

type Filter = "all" | "starred";

export function ProjectView(): JSX.Element {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

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

  const handleRenameProject = async (): Promise<void> => {
    if (!project) return;
    const name = window.prompt("Rename project", project.name)?.trim();
    if (!name || name === project.name) return;
    try {
      const updated = await projectsApi.rename(project.id, name);
      setProject(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rename failed");
    }
  };

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

  const handleDrop = async (e: DragEvent<HTMLDivElement>): Promise<void> => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith(".excalidraw") || f.type === "application/json"
    );
    for (const file of files) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as {
          elements?: unknown[];
          appState?: unknown;
          files?: unknown;
        };
        const name = file.name.replace(/\.excalidraw$|\.json$/i, "") || "Imported";
        const board = await boardsApi.create(projectId, name);
        await boardsApi.saveScene(board.id, {
          elements: parsed.elements ?? [],
          appState: parsed.appState ?? {},
          files: parsed.files ?? {},
        });
        setBoards((list) => [board, ...list]);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Import failed");
      }
    }
  };

  const starred = boards.filter((b) => b.is_favorite);
  const visible = filter === "starred" ? starred : boards;
  const createdAt = project
    ? new Date(project.created_at).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })
    : "";

  return (
    <div
      className={`project-view${dragOver ? " project-view--drag" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => void handleDrop(e)}
    >
      <GridBackdrop opacity={0.03} size={32} />
      {dragOver && (
        <div className="project-view__dropzone">
          Drop .excalidraw to import as a new board
        </div>
      )}
      <div className="project-view__inner">
        <nav className="project-view__crumbs mono">
          <Link to="/">Dashboard</Link>
          <span aria-hidden>›</span>
          <span className="project-view__crumbs-current">
            {project?.name ?? "…"}
          </span>
        </nav>

        <header className="project-view__head">
          <div className="project-view__head-left">
            <h1>{project?.name ?? (loading ? "Loading…" : "Project")}</h1>
            <div className="project-view__subline mono">
              <span>
                {boards.length} board{boards.length === 1 ? "" : "s"}
              </span>
              {project && (
                <>
                  <span>·</span>
                  <span>created {createdAt}</span>
                </>
              )}
              {project && (
                <>
                  <span>·</span>
                  <button
                    type="button"
                    className="project-view__rename"
                    onClick={() => void handleRenameProject()}
                  >
                    rename
                  </button>
                </>
              )}
            </div>
            {project && (
              <div className="project-view__tags">
                <TagEditor
                  kind="project"
                  projectId={project.id}
                  initial={project.tags}
                />
              </div>
            )}
          </div>
          <div className="project-view__head-right">
            <Button
              variant="soft"
              icon={<span aria-hidden>+</span>}
              onClick={() => void handleCreate()}
            >
              New board
            </Button>
          </div>
        </header>

        {error && <div className="project-view__error mono">{error}</div>}

        {!loading && boards.length > 0 && (
          <div className="project-view__filters">
            <FilterChip
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All · {boards.length}
            </FilterChip>
            <FilterChip
              active={filter === "starred"}
              onClick={() => setFilter("starred")}
            >
              Starred · {starred.length}
            </FilterChip>
            <span className="project-view__sort mono">sort: updated ↓</span>
          </div>
        )}

        {loading ? (
          <p className="project-view__muted mono">Loading…</p>
        ) : boards.length === 0 ? (
          <div className="project-view__empty">
            <SketchBorder
              radius={14}
              stroke="var(--color-line)"
              fill="var(--color-panel-lo)"
              dashed
              wobble={1.5}
            />
            <div className="project-view__empty-inner">
              <EmptyDoodle />
              <div className="project-view__empty-title">No boards yet</div>
              <div className="project-view__empty-sub mono">
                A board is your infinite canvas. Add as many as you need.
              </div>
              <div className="project-view__empty-actions">
                <Button variant="primary" onClick={() => void handleCreate()}>
                  Create the first board
                </Button>
                <Button variant="ghost">Drop .excalidraw to import</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="project-view__grid">
            {visible.map((b) => (
              <BoardCard
                key={b.id}
                board={b}
                onRename={() => void handleRename(b)}
                onToggleFavourite={() => void handleFavourite(b)}
                onDuplicate={() => void handleDuplicate(b)}
                onDelete={() => void handleDelete(b)}
              />
            ))}
            <NewBoardTile onClick={() => void handleCreate()} />
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      className={`pill pill--md pill--button${active ? " pill--active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function NewBoardTile({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      className="project-view__new-tile"
      onClick={onClick}
      aria-label="New blank board"
    >
      <SketchBorder
        radius={14}
        stroke="var(--color-line)"
        fill="transparent"
        dashed
        wobble={1.5}
      />
      <span className="project-view__new-tile-plus">+</span>
      <span className="project-view__new-tile-label">New blank board</span>
      <span className="project-view__new-tile-hint">or drag .excalidraw here</span>
    </button>
  );
}

function EmptyDoodle(): JSX.Element {
  return (
    <svg width={86} height={72} viewBox="0 0 86 72" aria-hidden>
      <defs>
        <filter id="pv-doodle-wob">
          <feTurbulence baseFrequency="0.04" numOctaves="2" />
          <feDisplacementMap in="SourceGraphic" scale="1.6" />
        </filter>
      </defs>
      <g
        fill="none"
        stroke="var(--color-muted-dim)"
        strokeWidth={1.4}
        strokeLinecap="round"
        filter="url(#pv-doodle-wob)"
      >
        <rect x={10} y={14} width={32} height={24} rx={3} />
        <circle cx={62} cy={26} r={12} />
        <path d="M20,52 L70,52" />
        <path d="M62,46 L70,52 L62,58" />
      </g>
    </svg>
  );
}
