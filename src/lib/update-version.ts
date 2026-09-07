// Shared, dependency-free version comparison for the Self-Hosted updater.
//
// The same rules must hold in three places: the Management Center endpoint
// that decides whether an installation is behind, the application UI that
// shows "an update is available", and the Windows updater service. Keeping
// one implementation avoids an installation being told it is current by one
// component and outdated by another.

function parts(v: string): Array<number | string> {
  return v
    .trim()
    .replace(/^v/i, "")
    .split(/[.\-+]/)
    .filter((s) => s.length > 0)
    .map((x) => (Number.isNaN(Number(x)) ? x : Number(x)));
}

/** True when `candidate` is strictly newer than `current`. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = parts(candidate);
  const b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (typeof x === "number" && typeof y === "number") {
      if (x > y) return true;
      if (x < y) return false;
    } else {
      const xs = String(x);
      const ys = String(y);
      if (xs > ys) return true;
      if (xs < ys) return false;
    }
  }
  return false;
}

/** True when `current` satisfies a minimum-version requirement. */
export function satisfiesMinVersion(current: string, minVersion: string | null): boolean {
  if (!minVersion) return true;
  return !isNewerVersion(minVersion, current);
}
