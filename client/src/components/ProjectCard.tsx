import { Link } from "react-router-dom";
import { SketchCard } from "./sketch/SketchCard";
import { SketchBorder } from "./sketch/SketchBorder";
import { Menu } from "./Menu";
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
  tags?: { id: string; name: string }[];
  onRename: () => void;
  onDelete: () => void;
}

export function ProjectCard({
  id,
  name,
  boardCount,
  updatedLabel,
  tags,
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
        {tags && tags.length > 0 && (
          <div className="project-card__tags">
            {tags.slice(0, 3).map((t) => (
              <span key={t.id} className="pill">
                #{t.name}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="project-card__tag-more mono">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </Link>
      <div className="project-card__actions">
        <Menu
          trigger={
            <button
              type="button"
              className="kebab-btn"
              aria-label={`Actions for ${name}`}
              title="Actions"
            >
              ⋯
            </button>
          }
          items={[
            { key: "rename", label: "Rename", onSelect: onRename },
            { key: "delete", label: "Delete", onSelect: onDelete, danger: true },
          ]}
        />
      </div>
    </SketchCard>
  );
}
