import { useEffect, useRef, useState } from "react";

/**
 * useCountUp — animates a numeric KPI from its previous value to the next one.
 * Functional motion only: it exists so a new audit run reads as a real process
 * instead of a silent data swap. Respects prefers-reduced-motion.
 */
export function useCountUp(target: number, durationMs = 900) {
  const safeTarget = Number.isFinite(target) ? target : 0;
  const [value, setValue] = useState(safeTarget);
  const fromRef = useRef(safeTarget);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const from = fromRef.current;
    if (reduced || durationMs <= 0 || from === safeTarget) {
      fromRef.current = safeTarget;
      setValue(safeTarget);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (safeTarget - from) * eased));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = safeTarget;
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      fromRef.current = safeTarget;
    };
  }, [safeTarget, durationMs]);

  return value;
}
