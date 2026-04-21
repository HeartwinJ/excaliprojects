import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { projectsApi, type Project } from "../api/projects";
import { boardsApi, type BoardSummary } from "../api/boards";
import { tagsApi, type SearchHit } from "../api/tags";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { ProjectCard } from "../components/ProjectCard";
import { BoardCard } from "../components/BoardCard";
import { BackupCard } from "../components/BackupCard";
import { GridBackdrop } from "../components/sketch/GridBackdrop";
import { SketchBorder } from "../components/sketch/SketchBorder";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import "./Dashboard.css";

interface RenameState {
  id: string;
  currentName: string;
}

export function Dashboard(): JSX.Element {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recent, setRecent] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [rename, setRename] = useState<RenameState | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[] | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const runSearch = useDebouncedCallback((q: string) => {
    if (q.trim().length === 0) {
      setSearchHits(null);
      return;
    }
    void tagsApi
      .search(q.trim())
      .then(setSearchHits)
      .catch(() => setSearchHits([]));
  }, 200);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([projectsApi.list(), boardsApi.recent()]);
      setProjects(p);
      setRecent(r);
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

  const handleCreate = async (): Promise<void> => {
    const name = newName.trim();
    if (!name) return;
    try {
      const p = await projectsApi.create(name);
      setProjects((list) => [...list, p]);
      setNewName("");
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create");
    }
  };

  const handleRename = async (): Promise<void> => {
    if (!rename) return;
    const name = renameValue.trim();
    if (!name) return;
    try {
      const updated = await projectsApi.rename(rename.id, name);
      setProjects((list) => list.map((p) => (p.id === updated.id ? updated : p)));
      setRename(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rename failed");
    }
  };

  const handleDelete = async (p: Project): Promise<void> => {
    if (!window.confirm(`Delete project "${p.name}" and all its boards?`)) return;
    try {
      await projectsApi.remove(p.id);
      setProjects((list) => list.filter((x) => x.id !== p.id));
      setRecent((list) => list.filter((b) => b.project_id !== p.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  const handleBoardRename = async (b: BoardSummary): Promise<void> => {
    const name = window.prompt("Rename board", b.name)?.trim();
    if (!name || name === b.name) return;
    try {
      const updated = await boardsApi.update(b.id, { name });
      setRecent((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rename failed");
    }
  };

  const handleBoardFavourite = async (b: BoardSummary): Promise<void> => {
    try {
      const updated = await boardsApi.update(b.id, { isFavorite: !b.is_favorite });
      setRecent((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    }
  };

  const handleBoardDuplicate = async (b: BoardSummary): Promise<void> => {
    try {
      const copy = await boardsApi.duplicate(b.id);
      setRecent((list) => [copy, ...list]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Duplicate failed");
    }
  };

  const handleBoardDelete = async (b: BoardSummary): Promise<void> => {
    if (!window.confirm(`Delete board "${b.name}"?`)) return;
    try {
      await boardsApi.remove(b.id);
      setRecent((list) => list.filter((x) => x.id !== b.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  const totalBoards = recent.length;
  const meta = loading
    ? "loading…"
    : `${projects.length} project${projects.length === 1 ? "" : "s"}${
        totalBoards > 0 ? ` · ${totalBoards} recent board${totalBoards === 1 ? "" : "s"}` : ""
      }`;

  return (
    <div className="dashboard">
      <GridBackdrop opacity={0.03} size={32} />
      <div className="dashboard__inner">
        <header className="dashboard__hero">
          <div className="dashboard__greeting">
            <h1>Hi {user?.username ?? "there"}</h1>
            <span className="dashboard__wave" aria-hidden>
              👋
            </span>
          </div>
          <p className="dashboard__subtitle mono">{meta}</p>
        </header>

        <div className="dashboard__search">
          <SketchBorder
            radius={11}
            stroke="var(--color-line-hi)"
            fill="var(--color-panel-lo)"
            wobble={1.4}
            seed={7}
          />
          <span className="dashboard__search-icon" aria-hidden>
            ⌕
          </span>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search projects, boards, and tags…"
            aria-label="Search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              runSearch(e.target.value);
            }}
            className="dashboard__search-input"
          />
          <kbd className="dashboard__search-kbd">⌘K</kbd>
        </div>

        {error && <div className="dashboard__error mono">{error}</div>}

        {searchHits !== null ? (
          <section className="dashboard__section">
            <SectionHeading title="Search results" meta={`${searchHits.length} hit(s)`} />
            {searchHits.length === 0 ? (
              <p className="dashboard__muted mono">No matches.</p>
            ) : (
              <SearchResults hits={searchHits} />
            )}
          </section>
        ) : (
          <>
            <section className="dashboard__section">
              <SectionHeading
                title="Projects"
                meta={projects.length > 0 ? "sorted by recent" : undefined}
                action={
                  <Button
                    variant="soft"
                    size="sm"
                    icon={<span aria-hidden>+</span>}
                    onClick={() => setCreateOpen(true)}
                  >
                    New project
                  </Button>
                }
              />
              {loading ? (
                <p className="dashboard__muted mono">Loading…</p>
              ) : projects.length === 0 ? (
                <EmptyProjects onCreate={() => setCreateOpen(true)} />
              ) : (
                <div className="dashboard__grid dashboard__grid--projects">
                  {projects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      id={p.id}
                      name={p.name}
                      onRename={() => {
                        setRename({ id: p.id, currentName: p.name });
                        setRenameValue(p.name);
                      }}
                      onDelete={() => void handleDelete(p)}
                    />
                  ))}
                  <NewProjectTile onClick={() => setCreateOpen(true)} />
                </div>
              )}
            </section>

            {recent.length > 0 && (
              <section className="dashboard__section">
                <SectionHeading title="Recent boards" meta="across all projects" />
                <div className="dashboard__grid dashboard__grid--boards">
                  {recent.map((b) => (
                    <BoardCard
                      key={b.id}
                      board={b}
                      onRename={() => void handleBoardRename(b)}
                      onToggleFavourite={() => void handleBoardFavourite(b)}
                      onDuplicate={() => void handleBoardDuplicate(b)}
                      onDelete={() => void handleBoardDelete(b)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="dashboard__section">
              <SectionHeading title="Backup & restore" />
              <BackupCard />
            </section>
          </>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create project"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleCreate()}
              disabled={!newName.trim()}
            >
              Create
            </Button>
          </>
        }
      >
        <label className="dashboard__field">
          <span>Project name</span>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Architecture diagrams"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
          />
        </label>
      </Modal>

      <Modal
        open={rename !== null}
        onClose={() => setRename(null)}
        title="Rename project"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRename(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleRename()}
              disabled={!renameValue.trim() || renameValue === rename?.currentName}
            >
              Save
            </Button>
          </>
        }
      >
        <label className="dashboard__field">
          <span>Project name</span>
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleRename();
            }}
          />
        </label>
      </Modal>
    </div>
  );
}

function SectionHeading({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: JSX.Element;
}): JSX.Element {
  return (
    <div className="dashboard__section-head">
      <div className="dashboard__section-head-left">
        <h2>{title}</h2>
        {meta && <span className="dashboard__section-meta mono">{meta}</span>}
      </div>
      {action}
    </div>
  );
}

function EmptyProjects({ onCreate }: { onCreate: () => void }): JSX.Element {
  return (
    <div className="dashboard__empty">
      <SketchBorder
        radius={14}
        stroke="var(--color-line)"
        fill="transparent"
        dashed
        wobble={1.5}
      />
      <div className="dashboard__empty-inner">
        <EmptyDoodle />
        <div className="dashboard__empty-title">No projects yet</div>
        <div className="dashboard__empty-sub mono">
          Create one to gather related boards and ideas.
        </div>
        <div style={{ marginTop: 16 }}>
          <Button variant="primary" onClick={onCreate}>
            Create your first project
          </Button>
        </div>
      </div>
    </div>
  );
}

function NewProjectTile({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <button type="button" className="dashboard__new-tile" onClick={onClick}>
      <SketchBorder
        radius={13}
        stroke="var(--color-line)"
        fill="transparent"
        dashed
        wobble={1.5}
      />
      <span className="dashboard__new-tile-plus">+</span>
      <span className="dashboard__new-tile-label">New project</span>
    </button>
  );
}

function EmptyDoodle(): JSX.Element {
  return (
    <svg
      width={86}
      height={72}
      viewBox="0 0 86 72"
      aria-hidden
      style={{ display: "block", margin: "0 auto" }}
    >
      <defs>
        <filter id="dash-doodle-wob">
          <feTurbulence baseFrequency="0.04" numOctaves="2" />
          <feDisplacementMap in="SourceGraphic" scale="1.6" />
        </filter>
      </defs>
      <g
        fill="none"
        stroke="var(--color-muted-dim)"
        strokeWidth={1.4}
        strokeLinecap="round"
        filter="url(#dash-doodle-wob)"
      >
        <rect x={10} y={14} width={32} height={24} rx={3} />
        <circle cx={62} cy={26} r={12} />
        <path d="M20,52 L70,52" />
        <path d="M62,46 L70,52 L62,58" />
      </g>
    </svg>
  );
}

function SearchResults({ hits }: { hits: SearchHit[] }): JSX.Element {
  return (
    <ul className="dashboard__hits">
      {hits.map((h) =>
        h.kind === "project" ? (
          <li key={`p-${h.id}`} className="dashboard__hit">
            <Link to={`/projects/${h.id}`}>
              <span className="dashboard__hit-kind mono">project</span>
              <span className="dashboard__hit-name">{h.name}</span>
            </Link>
          </li>
        ) : (
          <li key={`b-${h.id}`} className="dashboard__hit">
            <Link to={`/boards/${h.id}`}>
              <span className="dashboard__hit-kind mono">board</span>
              <span className="dashboard__hit-name">{h.name}</span>
              <span className="dashboard__hit-meta mono">
                in {h.project_name}
                {h.tags.length > 0 && ` · ${h.tags.join(", ")}`}
              </span>
            </Link>
          </li>
        )
      )}
    </ul>
  );
}
