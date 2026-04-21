import type { ButtonHTMLAttributes, ReactNode } from "react";
import { SketchBorder } from "./sketch/SketchBorder";
import "./Button.css";

type Variant =
  | "primary"
  | "soft"
  | "ghost"
  | "ink"
  | "secondary"
  | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({
  variant = "ghost",
  size = "md",
  className = "",
  type = "button",
  icon,
  children,
  ...rest
}: ButtonProps): JSX.Element {
  // "secondary" legacy name maps to the new ink variant.
  const resolved: Variant = variant === "secondary" ? "ink" : variant;
  const classes = ["btn", `btn--${resolved}`, `btn--${size}`, className]
    .filter(Boolean)
    .join(" ");
  const strokes: Record<Variant, string> = {
    primary: "var(--color-accent)",
    soft: "var(--color-accent-dim)",
    ghost: "var(--color-line-hi)",
    ink: "var(--color-line-hi)",
    secondary: "var(--color-line-hi)",
    danger: "var(--color-rose)",
  };
  return (
    <button type={type} className={classes} {...rest}>
      <SketchBorder
        radius={10}
        stroke={strokes[resolved]}
        fill="transparent"
        strokeWidth={1.6}
        wobble={1.4}
      />
      <span className="btn__inner">
        {icon != null ? <span className="btn__icon">{icon}</span> : null}
        {children != null ? <span>{children}</span> : null}
      </span>
    </button>
  );
}
