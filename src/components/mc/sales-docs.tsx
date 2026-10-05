import { useState } from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateSalesDoc, type SalesDocKind } from "@/lib/sales-tools.functions";

export type SalesDocTarget = {
  company_name: string;
  cui?: string | null;
  contact_name?: string | null;
  industry?: string | null;
  employees?: number | null;
};

export function downloadBase64Pdf(base64: string, filename: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function useSalesDoc() {
  const gen = useServerFn(generateSalesDoc);
  return async (kind: SalesDocKind, t: SalesDocTarget) => {
    const r = await gen({ data: { kind, ...t, employees: t.employees ?? null } });
    downloadBase64Pdf(r.base64, r.filename);
  };
}

/** One-click One-Pager and Security sheet buttons for a client or lead. */
export function SalesDocButtons({ target }: { target: SalesDocTarget }) {
  const make = useSalesDoc();
  const [busy, setBusy] = useState<SalesDocKind | null>(null);
  const run = async (kind: SalesDocKind) => {
    setBusy(kind);
    try {
      await make(kind, target);
      toast.success("PDF descărcat");
    } catch {
      toast.error("Nu am putut genera PDF-ul.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run("onepager")}>
        <FileText className="mr-1.5 h-4 w-4" />{busy === "onepager" ? "Se generează…" : "One-Pager PDF"}
      </Button>
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run("security")}>
        <ShieldCheck className="mr-1.5 h-4 w-4" />{busy === "security" ? "Se generează…" : "Fișă securitate & GDPR"}
      </Button>
    </div>
  );
}
