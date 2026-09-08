import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, XCircle, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/verify/$code")({
  ssr: false,
  component: VerifyPage,
});

type VerifyResult = {
  valid: boolean;
  issuedAt: string;
  score: number;
  pathTitle: string;
  company: string;
  recipient: string;
  certificateCode: string;
};

const CODE_RE = /^[0-9a-fA-F-]{8,64}$/;

function VerifyPage() {
  const { code } = useParams({ from: Route.id });
  const [state, setState] = useState<"loading" | "ok" | "missing" | "revoked">("loading");
  const [cert, setCert] = useState<VerifyResult | null>(null);

  useEffect(() => {
    void (async () => {
      if (!CODE_RE.test(code)) {
        setState("missing");
        return;
      }
      let result: VerifyResult | null = null;
      try {
        const res = await fetch(`/api/public/verify-certificate?code=${encodeURIComponent(code)}`);
        if (res.ok) {
          const body = (await res.json()) as { found?: boolean; certificate?: VerifyResult };
          if (body.found && body.certificate) result = body.certificate;
        }
      } catch {
        result = null;
      }
      if (!result) {
        // Cloud fallback (direct RPC) for older certificates.
        try {
          const { data } = await supabase.rpc("academy_verify_certificate", { _code: code });
          const r = data as VerifyResult | null;
          if (r?.certificateCode) result = r;
        } catch {
          result = null;
        }
      }
      if (!result) {
        setState("missing");
        return;
      }
      setCert(result);
      setState(result.valid ? "ok" : "revoked");
    })();
  }, [code]);


  return (
    <div className="min-h-dvh grid place-items-center bg-background p-6">
      <Card className="p-8 max-w-md w-full text-center space-y-4">
        <div className="flex justify-center">
          <GraduationCap className="h-10 w-10 text-primary" />
        </div>
        <div className="text-xl font-semibold">OPSQAI Academy Certificate</div>
        {state === "loading" && <div className="text-sm text-muted-foreground">Verifying…</div>}
        {state === "missing" && (
          <div className="text-sm text-destructive flex items-center justify-center gap-2">
            <XCircle className="h-4 w-4" /> Certificate not found.
          </div>
        )}
        {state === "revoked" && (
          <div className="text-sm text-destructive flex items-center justify-center gap-2">
            <XCircle className="h-4 w-4" /> Certificate has been revoked.
          </div>
        )}
        {state === "ok" && cert && (
          <div className="space-y-2 text-sm">
            <Badge variant="default" className="mx-auto">
              <ShieldCheck className="h-3 w-3 mr-1" /> Verified
            </Badge>
            <div>
              <b>{cert.recipient || "Learner"}</b>
            </div>
            <div className="text-muted-foreground">{cert.pathTitle}</div>
            <div className="text-muted-foreground">{cert.company}</div>
            <div>Score: {cert.score}%</div>
            <div className="text-xs text-muted-foreground">
              Issued {new Date(cert.issuedAt).toLocaleDateString()}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground break-all">
              {cert.certificateCode}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
