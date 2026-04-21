import { Link } from "react-router-dom";
import type { BoardSummary } from "../api/boards";
import { SketchCard } from "./sketch/SketchCard";
import { GridBackdrop } from "./sketch/GridBackdrop";
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
    <SketchCard
      radius={14}
      wobble={1.4}
      seed={board.name.length}
      fill="var(--color-panel)"
      className="board-card"
    >
      <Link
        to={`/boards/${board.id}`}
        className="board-card__thumb"
        aria-label={`Open ${board.name}`}
      >
        <GridBackdrop opacity={0.06} size={16} />
        {board.thumbnail_path ? (
          <img src={board.thumbnail_path} alt="" />
        ) : (
          <BoardThumbSketch seed={board.name.length} />
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
        <div className="board-card__meta mono">Updated {updated}</div>
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
    </SketchCard>
  );
}

function BoardThumbSketch({ seed }: { seed: number }): JSX.Element {
  const variants = ["a", "b", "c", "d"] as const;
  const variant = variants[seed % variants.length]!;
  return (
    <svg
      viewBox="0 0 200 90"
      preserveAspectRatio="xMidYMid meet"
      className="board-card__thumb-svg"
      aria-hidden
    >
      <defs>
        <filter id={`bc-wob-${seed}`}>
          <feTurbulence baseFrequency="0.04" numOctaves="2" />
          <feDisplacementMap in="SourceGraphic" scale="1.5" />
        </filter>
      </defs>
      <g
        fill="none"
        stroke="var(--color-text-soft)"
        strokeWidth={1.3}
        strokeLinecap="round"
        filter={`url(#bc-wob-${seed})`}
      >
        {variant === "a" && (
          <>
            <rect x={30} y={20} width={60} height={40} rx={4} />
            <circle cx={135} cy={40} r={18} />
            <path d="M95,40 L115,40" />
            <path d="M108,34 L115,40 L108,46" />
          </>
        )}
        {variant === "b" && (
          <>
            <rect x={40} y={15} width={120} height={10} rx={3} />
            <rect x={40} y={34} width={120} height={10} rx={3} />
            <rect
              x={40}
              y={53}
              width={80}
              height={14}
              rx={3}
              stroke="var(--color-accent)"
            />
          </>
        )}
        {variant === "c" && (
          <>
            <rect x={20} y={15} width={70} height={55} />
            <rect x={95} y={15} width={40} height={25} />
            <rect x={95} y={45} width={40} height={25} />
            <rect x={140} y={15} width={40} height={55} />
          </>
        )}
        {variant === "d" && (
          <>
            <rect x={30} y={20} width={35} height={50} rx={4} />
            <rect x={75} y={20} width={35} height={50} rx={4} />
            <rect
              x={120}
              y={20}
              width={35}
              height={50}
              rx={4}
              stroke="var(--color-amber)"
            />
            <path d="M30,75 Q 100,85 155,75" />
          </>
        )}
      </g>
    </svg>
  );
}
