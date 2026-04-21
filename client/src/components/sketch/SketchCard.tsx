import type { CSSProperties, ReactNode } from "react";
import { SketchBorder } from "./SketchBorder";

type SketchCardProps = {
  children?: ReactNode;
  radius?: number;
  stroke?: string;
  fill?: string;
  dashed?: boolean;
  wobble?: number;
  seed?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
};

export function SketchCard({
  children,
  radius = 14,
  stroke,
  fill = "var(--color-panel)",
  dashed = false,
  wobble = 1.4,
  seed = 1,
  strokeWidth = 1.5,
  className,
  style,
  onClick,
}: SketchCardProps): JSX.Element {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        position: "relative",
        borderRadius: radius,
        ...style,
      }}
    >
      <SketchBorder
        radius={radius}
        stroke={stroke ?? "var(--color-line)"}
        fill={fill}
        dashed={dashed}
        wobble={wobble}
        seed={seed}
        strokeWidth={strokeWidth}
      />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}
