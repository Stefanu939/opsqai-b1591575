/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMyCertificates, certificateSignedUrl } from "@/lib/academy.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Award, Download } from "lucide-react";
import { AcademySubnav } from "@/components/app/academy-subnav";
import { downloadBase64 } from "@/components/app/transport/download";

export const Route = createFileRoute("/_authenticated/app/academy/certificates")({
  component: CertificatesPage,
  validateSearch: (s: Record<string, unknown>): { completed?: string } =>
    typeof s.completed === "string" ? { completed: s.completed } : {},
  head: () => ({ meta: [{ title: "Certificates · Academy" }] }),
});

function CertificatesPage() {
  const list = useServerFn(listMyCertificates);
  const url = useServerFn(certificateSignedUrl);
  const [certs, setCerts] = useState<any[]>([]);
  const { completed } = Route.useSearch();

  useEffect(() => {
    void (async () => setCerts(((await list()) as any[]) ?? []))();
  }, []);

  const download = async (id: string) => {
    const res = (await url({ data: { id } })) as { base64?: string; filename?: string; url: string };
    if (res.base64) {
      downloadBase64(res.filename ?? `opsqai-certificate-${id}.pdf`, res.base64, "application/pdf");
      return;
    }
    window.open(res.url, "_blank");
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <AcademySubnav />
      <div className="px-4 py-8 md:px-6 max-w-7xl mx-auto w-full space-y-4">
        <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />OPSQAI Academy</div>
<h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-3">
          <Award className="h-5 w-5 text-primary" /> Your certificates
        </h1>
        {completed && (
          <Card className="p-4 border-success/40 bg-success/10 text-sm">
            <strong>Felicitări!</strong> Ai finalizat cursul cu succes. Diploma ta a fost emisă!
          </Card>
        )}
        {certs.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No certificates yet — complete a learning path to earn one.
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {certs.map((c) => (
              <Card key={c.id} className="p-4 space-y-2">
                <div className="font-medium text-sm">{c.academy_learning_paths?.title}</div>
                <div className="text-xs text-muted-foreground">
                  Score {c.final_score}% · {new Date(c.issued_at).toLocaleDateString()}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground break-all">
                  {c.certificate_code}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!c.pdf_path}
                  onClick={() => download(c.id)}
                >
                  <Download className="h-4 w-4 mr-1" />{" "}
                  {c.pdf_path ? "Download PDF" : "Generating…"}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
