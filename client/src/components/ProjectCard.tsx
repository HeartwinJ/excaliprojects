import { Link } from "react-router-dom";
import "./ProjectCard.css";

interface ProjectCardProps {
  id: string;
  name: string;
  onRename: () => void;
  onDelete: () => void;
}

export function ProjectCard({ id, name, onRename, onDelete }: ProjectCardProps): JSX.Element {
  return (
    <article className="project-card">
      <Link to={`/projects/${id}`} className="project-card__link">
        <span className="project-card__icon" aria-hidden>
          📁
        </span>
        <span className="project-card__name">{name}</span>
      </Link>
      <div className="project-card__actions">
        <button
          type="button"
          className="project-card__action"
          aria-label={`Rename ${name}`}
          onClick={onRename}
        >
          ✎
        </button>
        <button
          type="button"
          className="project-card__action project-card__action--danger"
          aria-label={`Delete ${name}`}
          onClick={onDelete}
        >
          🗑
        </button>
      </div>
    </article>
  );
}
