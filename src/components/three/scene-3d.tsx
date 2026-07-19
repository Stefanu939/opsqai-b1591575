import { Canvas, type CanvasProps } from "@react-three/fiber";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Scene3DProps {
  children: ReactNode;
  className?: string;
  /** Optional PNG shown when prefers-reduced-motion or before hydration. */
  posterSrc?: string;
  posterAlt?: string;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
  dpr?: CanvasProps["dpr"];
  frameloop?: CanvasProps["frameloop"];
  /** Pause rendering when off-screen. Default true. */
  pauseOffscreen?: boolean;
}

/**
 * OIX 3D scene wrapper.
 * - Lazy: only mounts the Canvas after hydration + IntersectionObserver.
 * - Respects `prefers-reduced-motion`: renders poster PNG instead.
 * - Pauses `frameloop` when the scene leaves the viewport.
 * - Absolutely positioned; parent controls the aspect box.
 */
export function Scene3D({
  children,
  className,
  posterSrc,
  posterAlt = "",
  cameraPosition = [0, 0, 6],
  cameraFov = 45,
  dpr = [1, 1.8],
  frameloop = "always",
  pauseOffscreen = true,
}: Scene3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !pauseOffscreen) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "150px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pauseOffscreen]);

  const usePoster = !mounted || reducedMotion;

  return (
    <div ref={containerRef} className={cn("relative w-full h-full", className)} aria-hidden>
      {usePoster ? (
        posterSrc ? (
          <img
            src={posterSrc}
            alt={posterAlt}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
        ) : (
          <div
            className="absolute inset-0 h-full w-full"
            style={{ background: "var(--oix-gradient-genesis)" }}
          />
        )
      ) : (
        <Canvas
          camera={{ position: cameraPosition, fov: cameraFov }}
          dpr={dpr}
          frameloop={inView ? frameloop : "never"}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          className="absolute inset-0"
        >
          {children}
        </Canvas>
      )}
    </div>
  );
}
