/**
 * Shared "draft — pending final legal review" disclaimer.
 *
 * MUST render identically on every legal / trust surface AND in every
 * PDF/brochure generated for prospects. The canonical wording lives in
 * DRAFT_DISCLAIMER_TEXT so plaintext generators (PPT, PDF, plain HTML
 * exports) can import the same string.
 */
export const DRAFT_DISCLAIMER_TEXT =
  "This document reflects our intended data protection posture and is pending final legal review. It does not yet constitute the binding agreement between the parties. Contact notify@opsqai.de for the current status before relying on it for procurement decisions.";

/** Contact address referenced in the disclaimer — kept here so it can be
 *  swapped in one place if it changes. */
export const DRAFT_DISCLAIMER_CONTACT = "notify@opsqai.de";

export function DraftDisclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      aria-label="Draft — pending legal review"
      className={
        "not-prose my-6 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200 " +
        className
      }
    >
      <strong className="font-semibold">Draft — pending legal review. </strong>
      This document reflects our intended data protection posture and is pending final legal review.
      It does not yet constitute the binding agreement between the parties. Contact{" "}
      <a href={`mailto:${DRAFT_DISCLAIMER_CONTACT}`} className="underline">
        {DRAFT_DISCLAIMER_CONTACT}
      </a>{" "}
      for the current status before relying on it for procurement decisions.
    </div>
  );
}
