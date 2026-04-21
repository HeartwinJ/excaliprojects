import { useId, type CSSProperties } from "react";

type SketchBorderProps = {
  radius?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  dashed?: boolean;
  seed?: number;
  wobble?: number;
  style?: CSSProperties;
};

/**
 * Rough, hand-drawn border rendered as an SVG <rect> distorted by an
 * <feDisplacementMap> filter. Positioned absolutely inside a
 * `position: relative` wrapper so content can layer above it.
 */
export function SketchBorder({
  radius = 12,
  stroke = "var(--color-line)",
  fill = "transparent",
  strokeWidth = 1.5,
  dashed = false,
  seed = 1,
  wobble = 1.3,
  style,
}: SketchBorderProps): JSX.Element {
  const rawId = useId();
  const id = `sb-${rawId.replace(/[:]/g, "")}`;
  return (
    <svg
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "visible",
        ...style,
      }}
    >
      <defs>
        <filter
          id={id}
          x="-5%"
          y="-5%"
          width="110%"
          height="110%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves={2}
            seed={seed}
          />
          <feDisplacementMap in="SourceGraphic" scale={wobble} />
        </filter>
      </defs>
      <rect
        x={1}
        y={1}
        width="calc(100% - 2px)"
        height="calc(100% - 2px)"
        rx={radius}
        ry={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? "5 4" : undefined}
        filter={`url(#${id})`}
      />
    </svg>
  );
}
