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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function VerifyPage() {
  const { code } = useParams({ from: Route.id });
  const [state, setState] = useState<"loading" | "ok" | "missing" | "revoked">("loading");
  const [cert, setCert] = useState<VerifyResult | null>(null);

  useEffect(() => {
    void (async () => {
      if (!UUID_RE.test(code)) {
        setState("missing");
        return;
      }
      const { data, error } = await supabase.rpc("academy_verify_certificate", { _code: code });
      if (error || !data) {
        setState("missing");
        return;
      }
      const r = data as VerifyResult;
      if (!r.certificateCode) {
        setState("missing");
        return;
      }
      if (!r.valid) {
        setCert(r);
        setState("revoked");
        return;
      }
      setCert(r);
      setState("ok");
    })();
  }, [code]);

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
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
