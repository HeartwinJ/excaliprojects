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

  return (
    <div className="dashboard">
      <section className="dashboard__hero">
        <h1>Hi {user?.username} 👋</h1>
        <p>Organise your drawings into projects and boards.</p>
      </section>

      <div className="dashboard__search">
        <input
          ref={searchRef}
          type="search"
          placeholder="Search projects, boards, and tags…  (⌘K)"
          aria-label="Search"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            runSearch(e.target.value);
          }}
        />
      </div>

      {error && <div className="dashboard__error">{error}</div>}

      {searchHits !== null ? (
        <section className="dashboard__section">
          <header className="dashboard__section-head">
            <h2>Search results</h2>
          </header>
          {searchHits.length === 0 ? (
            <p className="dashboard__muted">No matches.</p>
          ) : (
            <SearchResults hits={searchHits} />
          )}
        </section>
      ) : (
        <>
          <section className="dashboard__section">
            <header className="dashboard__section-head">
              <h2>Projects</h2>
              <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                + New project
              </Button>
            </header>
            {loading ? (
              <p className="dashboard__muted">Loading…</p>
            ) : projects.length === 0 ? (
              <p className="dashboard__muted">No projects yet. Create one to get started.</p>
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
              </div>
            )}
          </section>

          {recent.length > 0 && (
            <section className="dashboard__section">
              <header className="dashboard__section-head">
                <h2>Recent boards</h2>
              </header>
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

          <BackupCard />
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create project"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleCreate()} disabled={!newName.trim()}>
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

function SearchResults({ hits }: { hits: SearchHit[] }): JSX.Element {
  return (
    <ul className="dashboard__hits">
      {hits.map((h) =>
        h.kind === "project" ? (
          <li key={`p-${h.id}`} className="dashboard__hit">
            <Link to={`/projects/${h.id}`}>
              <span className="dashboard__hit-kind">Project</span>
              <span className="dashboard__hit-name">{h.name}</span>
            </Link>
          </li>
        ) : (
          <li key={`b-${h.id}`} className="dashboard__hit">
            <Link to={`/boards/${h.id}`}>
              <span className="dashboard__hit-kind">Board</span>
              <span className="dashboard__hit-name">{h.name}</span>
              <span className="dashboard__hit-meta">
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
