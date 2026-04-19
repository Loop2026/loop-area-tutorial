// =====================================================
// LoopLogo — logo brand LOOP (wordmark + occhiello)
// =====================================================
interface Props {
  size?: number;     // altezza in px
  variant?: "dark" | "light";
}

export function LoopLogo({ size = 40, variant = "dark" }: Props) {
  const color = variant === "dark" ? "#0B1628" : "#FFFFFF";
  const accent = "#2563EB";
  return (
    <svg
      height={size}
      viewBox="0 0 220 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="LOOP"
    >
      {/* Occhiello */}
      <path
        d="M30 8a22 22 0 1 0 0 44 22 22 0 0 0 0-44Zm0 10a12 12 0 1 1 0 24 12 12 0 0 1 0-24Z"
        fill={accent}
      />
      {/* Wordmark LOOP */}
      <text
        x="62"
        y="40"
        fontFamily="Plus Jakarta Sans, sans-serif"
        fontWeight="800"
        fontSize="32"
        letterSpacing="-1.5"
        fill={color}
      >
        LOOP
      </text>
    </svg>
  );
}
