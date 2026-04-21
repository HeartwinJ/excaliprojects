import type { CSSProperties } from "react";

type Props = {
  opacity?: number;
  size?: number;
  style?: CSSProperties;
};

/**
 * Faint grid-paper texture, fading out at the edges via a radial mask.
 * Rendered as a full-size absolutely-positioned background layer.
 */
export function GridBackdrop({
  opacity = 0.04,
  size = 28,
  style,
}: Props): JSX.Element {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage:
          "linear-gradient(var(--color-text) 1px, transparent 1px), linear-gradient(90deg, var(--color-text) 1px, transparent 1px)",
        backgroundSize: `${size}px ${size}px`,
        opacity,
        WebkitMaskImage:
          "radial-gradient(ellipse at center, black 40%, transparent 85%)",
        maskImage:
          "radial-gradient(ellipse at center, black 40%, transparent 85%)",
        ...style,
      }}
    />
  );
}
