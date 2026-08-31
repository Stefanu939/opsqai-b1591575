import { cn } from "@/lib/utils";

/**
 * Sparse luminous points. Deterministic positions (hash-based, no Math.random)
 * so server and client render identically.
 */
export function Starfield({
  className,
  count = 26,
  opacity = 0.7,
}: {
  className?: string;
  count?: number;
  opacity?: number;
}) {
  const points = Array.from({ length: count }, (_, i) => {
    const a = Math.sin(i * 12.9898) * 43758.5453;
    const b = Math.sin(i * 78.233) * 12345.6789;
    const x = ((a - Math.floor(a)) * 100).toFixed(2);
    const y = ((b - Math.floor(b)) * 100).toFixed(2);
    const r = i % 7 === 0 ? 1.6 : i % 3 === 0 ? 1.1 : 0.7;
    return { x, y, r, dim: 0.25 + ((i * 37) % 60) / 100 };
  });

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{ opacity }}
    >
      {points.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.r * 2,
            height: p.r * 2,
            opacity: p.dim,
            background: i % 5 === 0 ? "var(--gold)" : "var(--primary-glow, var(--primary))",
            boxShadow: "0 0 6px currentColor",
          }}
        />
      ))}
    </div>
  );
}
