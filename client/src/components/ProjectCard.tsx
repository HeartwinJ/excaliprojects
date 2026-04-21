import { Link } from "react-router-dom";
import { SketchCard } from "./sketch/SketchCard";
import { SketchBorder } from "./sketch/SketchBorder";
import "./ProjectCard.css";

const SWATCHES = [
  "var(--color-accent)",
  "var(--color-amber)",
  "var(--color-mint)",
  "var(--color-rose)",
  "var(--color-accent-soft)",
] as const;

function swatchFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return SWATCHES[Math.abs(hash) % SWATCHES.length]!;
}

interface ProjectCardProps {
  id: string;
  name: string;
  boardCount?: number;
  updatedLabel?: string;
  onRename: () => void;
  onDelete: () => void;
}

export function ProjectCard({
  id,
  name,
  boardCount,
  updatedLabel,
  onRename,
  onDelete,
}: ProjectCardProps): JSX.Element {
  const swatch = swatchFor(name);
  const initial = (name.trim()[0] ?? "·").toUpperCase();
  return (
    <SketchCard
      radius={13}
      wobble={1.5}
      seed={name.length % 9}
      fill="var(--color-panel)"
      className="project-card"
    >
      <Link to={`/projects/${id}`} className="project-card__link" aria-label={name}>
        <div className="project-card__head">
          <span
            className="project-card__mark"
            aria-hidden
            style={{ color: swatch }}
          >
            <SketchBorder
              radius={6}
              stroke={swatch}
              fill={`color-mix(in oklab, ${swatch} 13%, transparent)`}
              wobble={1.2}
            />
            <span>{initial}</span>
          </span>
          <span className="project-card__name">{name}</span>
        </div>
        <div className="project-card__meta">
          <span>
            {boardCount === undefined
              ? "project"
              : `${boardCount} board${boardCount === 1 ? "" : "s"}`}
          </span>
          {updatedLabel && <span>{updatedLabel}</span>}
        </div>
      </Link>
      <div className="project-card__actions">
        <button
          type="button"
          className="project-card__action"
          aria-label={`Rename ${name}`}
          title="Rename"
          onClick={onRename}
        >
          Rename
        </button>
        <span className="project-card__sep" aria-hidden>
          ·
        </span>
        <button
          type="button"
          className="project-card__action project-card__action--danger"
          aria-label={`Delete ${name}`}
          title="Delete"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </SketchCard>
  );
}
