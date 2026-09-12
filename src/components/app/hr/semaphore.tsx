// Candidate match semaphore: red / amber / green with the percentage.
// The percentage comes from the deterministic weighted score, never from AI.

export type SemaphoreLevel = "red" | "amber" | "green";

export function semaphoreLevel(score: number): SemaphoreLevel {
  if (score >= 75) return "green";
  if (score >= 50) return "amber";
  return "red";
}

const DOT: Record<SemaphoreLevel, string> = {
  red: "bg-destructive",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
};

const BAR: Record<SemaphoreLevel, string> = {
  red: "bg-destructive",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
};

export function MatchSemaphore({
  score,
  label,
  className = "",
  showBar = true,
}: {
  score: number | null;
  label?: string;
  className?: string;
  showBar?: boolean;
}) {
  if (score === null || !Number.isFinite(score)) {
    return <span className={`text-xs text-muted-foreground ${className}`}>—</span>;
  }
  const level = semaphoreLevel(score);
  return (
    <div className={`flex items-center gap-2 ${className}`} title={label ? `${label}: ${score}%` : `${score}%`}>
      <span className={`size-2.5 shrink-0 rounded-full ${DOT[level]}`} aria-hidden />
      {showBar ? (
        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted" aria-hidden>
          <span className={`block h-full rounded-full ${BAR[level]}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
        </span>
      ) : null}
      <span className="text-xs font-medium tabular-nums">{score}%</span>
    </div>
  );
}
