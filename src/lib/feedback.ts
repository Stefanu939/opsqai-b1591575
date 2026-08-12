// OPSQAI feedback language.
//
// One vocabulary for every confirmation in the product: short, factual,
// auto-dismissing, with "View details" only where an error has detail worth
// reading. Motion and copy both exist to explain a state change.

import { toast } from "sonner";

const SUCCESS_MS = 2600;
const WARNING_MS = 5000;
const ERROR_MS = 7000;

/** ✓ Saved successfully */
export function notifySaved(what?: string) {
  toast.success(what ? `${what} saved successfully` : "Saved successfully", {
    duration: SUCCESS_MS,
  });
}

/** ✓ 3 SOPs imported */
export function notifyImported(count: number, noun = "item") {
  const label = count === 1 ? noun : `${noun}s`;
  toast.success(`${count} ${label} imported`, { duration: SUCCESS_MS });
}

/** ! Import completed with 2 warnings */
export function notifyPartial(message: string, details?: string) {
  toast.warning(message, {
    duration: WARNING_MS,
    ...(details ? { action: { label: "View details", onClick: () => toast.message(details) } } : {}),
  });
}

/** × Couldn't validate the license */
export function notifyFailed(what: string, error?: unknown) {
  const details = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  toast.error(`Couldn't ${what}`, {
    duration: ERROR_MS,
    ...(details
      ? { action: { label: "View details", onClick: () => toast.message(details) } }
      : {}),
  });
}

/** Neutral progress note for long operations. */
export function notifyRunning(message: string) {
  return toast.loading(message);
}
