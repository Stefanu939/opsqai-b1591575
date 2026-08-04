import type { ReactNode } from "react";
import { OixLayout } from "@/components/oix/oix-layout";

/**
 * Legacy marketing shell. The old header/footer chrome has been retired —
 * every marketing surface now renders inside the OIX shell so navigation
 * is identical across the whole site (no route can lead back to the old
 * layout).
 */
export function MarketingLayout({ children }: { children: ReactNode }) {
  return <OixLayout>{children}</OixLayout>;
}
