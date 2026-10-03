import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, XCircle, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/verify/")({
  validateSearch: z.object({ cert: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Verificare diplomă · OPSQAI Academy" },
      { name: "description", content: "Verificați autenticitatea unei diplome OPSQAI Academy." },
      { property: "og:title", content: "Verificare diplomă · OPSQAI Academy" },
      { property: "og:description", content: "Verificați autenticitatea unei diplome OPSQAI Academy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyTokenPage,
});

type Cert = {
  issuedAt: string;
  score: number;
  pathTitle: string;
  company: string;
  recipient: string;
  certificateCode: string;
  keyFingerprint?: string;
};

function VerifyTokenPage() {
  const { cert: token } = Route.useSearch();
  const [state, setState] = useState<"loading" | "ok" | "invalid">("loading");
  const [cert, setCert] = useState<Cert | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`/api/public/verify-certificate?cert=${encodeURIComponent(token)}`);
        const body = (await res.json()) as { found?: boolean; certificate?: Cert };
        if (res.ok && body.found && body.certificate) {
          setCert(body.certificate);
          setState("ok");
          return;
        }
      } catch {
        /* fallthrough */
      }
      setState("invalid");
    })();
  }, [token]);

  return (
    <div className="min-h-dvh grid place-items-center bg-background p-6">
      <Card className="p-8 max-w-md w-full text-center space-y-4">
        <div className="flex justify-center">
          <GraduationCap className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-xl font-semibold">Diplomă OPSQAI Academy</h1>
        {state === "loading" && <div className="text-sm text-muted-foreground">Se verifică…</div>}
        {state === "invalid" && (
          <div className="text-sm text-destructive flex items-center justify-center gap-2">
            <XCircle className="h-4 w-4" /> Diploma nu a putut fi verificată (semnătură invalidă sau link incomplet).
          </div>
        )}
        {state === "ok" && cert && (
          <div className="space-y-2 text-sm">
            <Badge className="mx-auto">
              <ShieldCheck className="h-3 w-3 mr-1" /> Diplomă verificată și autentică
            </Badge>
            <div className="text-base"><b>{cert.recipient}</b></div>
            <div className="text-muted-foreground">{cert.pathTitle}</div>
            <div className="text-muted-foreground">{cert.company}</div>
            <div>Scor: {cert.score}%</div>
            <div className="text-xs text-muted-foreground">Emisă: {cert.issuedAt}</div>
            <div className="font-mono text-[10px] text-muted-foreground break-all">ID: {cert.certificateCode}</div>
            {cert.keyFingerprint && (
              <div className="font-mono text-[10px] text-muted-foreground">Cheie emitent: {cert.keyFingerprint}</div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
