/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMyCertificates, certificateSignedUrl } from "@/lib/academy.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Award, Download } from "lucide-react";
import { AcademySubnav } from "@/components/app/academy-subnav";

export const Route = createFileRoute("/_authenticated/app/academy/certificates")({
  component: CertificatesPage,
  head: () => ({ meta: [{ title: "Certificates · Academy" }] }),
});

function CertificatesPage() {
  const list = useServerFn(listMyCertificates);
  const url = useServerFn(certificateSignedUrl);
  const [certs, setCerts] = useState<any[]>([]);

  useEffect(() => { void (async () => setCerts(((await list()) as any[]) ?? []))(); }, []);

  const download = async (id: string) => {
    const { url: u } = (await url({ data: { id } })) as { url: string };
    window.open(u, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AcademySubnav />
      <div className="p-6 max-w-5xl mx-auto w-full space-y-4">
        <h1 className="text-xl font-semibold flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Your certificates</h1>
        {certs.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">No certificates yet — complete a learning path to earn one.</Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {certs.map((c) => (
              <Card key={c.id} className="p-4 space-y-2">
                <div className="font-medium text-sm">{c.academy_learning_paths?.title}</div>
                <div className="text-xs text-muted-foreground">Score {c.final_score}% · {new Date(c.issued_at).toLocaleDateString()}</div>
                <div className="text-[10px] font-mono text-muted-foreground break-all">{c.certificate_code}</div>
                <Button size="sm" variant="outline" disabled={!c.pdf_path} onClick={() => download(c.id)}>
                  <Download className="h-4 w-4 mr-1" /> {c.pdf_path ? "Download PDF" : "Generating…"}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
