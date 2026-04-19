// =====================================================
// LoopLogo — usa il PNG brand (light/dark) da /public
// =====================================================
interface Props {
  size?: number;     // altezza in px
  variant?: "dark" | "light";
  className?: string;
}

// dimensioni intrinseche dell'asset originale
const SRC_W = 1017;
const SRC_H = 256;
const RATIO = SRC_W / SRC_H;

export function LoopLogo({ size = 64, variant = "dark", className }: Props) {
  const src =
    variant === "light" ? "/loop-logo-light.png" : "/loop-logo-dark.png";
  const width = Math.round(size * RATIO);
  return (
    <img
      src={src}
      alt="LOOP"
      height={size}
      width={width}
      className={className}
      style={{ height: size, width: "auto", display: "block" }}
    />
  );
}
