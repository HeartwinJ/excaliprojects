import type { CSSProperties, ReactNode } from "react";
import { SketchBorder } from "./SketchBorder";

type Props = {
  children: ReactNode;
  tone?: string;
  hash?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
  title?: string;
};

/** Small sketch-bordered pill for tags, filter chips, etc. */
export function Tag({
  children,
  tone,
  hash = true,
  style,
  onClick,
  title,
}: Props): JSX.Element {
  return (
    <span
      title={title}
      onClick={onClick}
      style={{
        position: "relative",
        display: "inline-block",
        fontSize: 10.5,
        lineHeight: 1.5,
        padding: "2px 8px",
        fontFamily: "var(--font-mono)",
        color: tone ?? "var(--color-text-soft)",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      <SketchBorder
        radius={999}
        stroke="var(--color-line-hi)"
        fill="var(--color-panel-lo)"
        wobble={1.0}
      />
      <span style={{ position: "relative" }}>
        {hash ? "#" : ""}
        {children}
      </span>
    </span>
  );
}
