import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  tone?: string;
  background?: string;
  borderColor?: string;
  hash?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
  title?: string;
};

/**
 * Flat pill used for tags and small badges. Intentionally *not* sketched —
 * the wobbly SVG filter distorts tight pill radii too aggressively.
 */
export function Tag({
  children,
  tone,
  background,
  borderColor,
  hash = true,
  style,
  onClick,
  title,
}: Props): JSX.Element {
  return (
    <span
      title={title}
      onClick={onClick}
      className="pill"
      style={{
        color: tone ?? "var(--color-text-soft)",
        background: background ?? "var(--color-panel-lo)",
        borderColor: borderColor ?? "var(--color-line-hi)",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {hash ? "#" : ""}
      {children}
    </span>
  );
}
