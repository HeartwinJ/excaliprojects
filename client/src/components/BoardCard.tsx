import { Link } from "react-router-dom";
import type { BoardSummary } from "../api/boards";
import "./BoardCard.css";

interface BoardCardProps {
  board: BoardSummary;
  onRename: () => void;
  onToggleFavourite: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function BoardCard({
  board,
  onRename,
  onToggleFavourite,
  onDuplicate,
  onDelete,
}: BoardCardProps): JSX.Element {
  const updated = new Date(board.updated_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <article className="board-card">
      <Link to={`/boards/${board.id}`} className="board-card__thumb">
        {board.thumbnail_path ? (
          <img src={board.thumbnail_path} alt="" />
        ) : (
          <div className="board-card__thumb-placeholder" aria-hidden>
            ✦
          </div>
        )}
      </Link>
      <div className="board-card__body">
        <div className="board-card__title-row">
          <Link to={`/boards/${board.id}`} className="board-card__title">
            {board.name}
          </Link>
          <button
            type="button"
            className="board-card__fav"
            aria-pressed={board.is_favorite}
            aria-label={board.is_favorite ? "Unpin" : "Pin"}
            onClick={onToggleFavourite}
          >
            {board.is_favorite ? "★" : "☆"}
          </button>
        </div>
        <div className="board-card__meta">Updated {updated}</div>
        <div className="board-card__actions">
          <button type="button" className="board-card__btn" onClick={onRename}>
            Rename
          </button>
          <button type="button" className="board-card__btn" onClick={onDuplicate}>
            Duplicate
          </button>
          <button
            type="button"
            className="board-card__btn board-card__btn--danger"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
