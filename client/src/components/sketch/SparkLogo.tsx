type Props = {
  size?: number;
  color?: string;
};

/** Excalidraw-style four-point sparkle logo. */
export function SparkLogo({
  size = 18,
  color = "var(--color-accent)",
}: Props): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path
        d="M12 2.5 C 12.6 7.5 14.5 10.2 21 12 C 14.8 13.5 12.7 16.2 12 21.5 C 11.4 16.3 9.4 13.6 3 12 C 9.3 10.3 11.4 7.6 12 2.5 Z"
        fill={color}
        stroke={color}
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}
