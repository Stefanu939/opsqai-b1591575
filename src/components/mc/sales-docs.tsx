import { FileText, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { onePagerHtml, openHtml, securityHtml } from "@/lib/sales-html";
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

/** One-click One-Pager (free pilot, no prices) and Security page for a client or lead. */
export function SalesDocButtons({ target }: { target: SalesDocTarget }) {
  const input = { company: target.company_name, contact: target.contact_name ?? undefined, industry: target.industry ?? undefined };
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => openHtml(onePagerHtml(input))}>
        <FileText className="mr-1.5 h-4 w-4" />One-Pager (pilot gratuit)
      </Button>
      <Button size="sm" variant="outline" onClick={() => openHtml(securityHtml(input))}>
        <ShieldCheck className="mr-1.5 h-4 w-4" />Pagină securitate & GDPR
      </Button>
    </div>
  );
}
