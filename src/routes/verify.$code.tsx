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

function VerifyPage() {
  const { code } = useParams({ from: Route.id });
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [cert, setCert] = useState<any>(null);
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("academy_certificates")
        .select("final_score, issued_at, revoked, academy_learning_paths(title), profiles:user_id(full_name)")
        .eq("certificate_code", code).maybeSingle();
      if (!data || (data as any).revoked) setState("missing");
      else { setCert(data); setState("ok"); }
    })();
  }, [code]);
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <Card className="p-8 max-w-md w-full text-center space-y-4">
        <div className="flex justify-center"><GraduationCap className="h-10 w-10 text-primary" /></div>
        <div className="text-xl font-semibold">OPSQAI Academy Certificate</div>
        {state === "loading" && <div className="text-sm text-muted-foreground">Verifying…</div>}
        {state === "missing" && (
          <div className="text-sm text-destructive flex items-center justify-center gap-2"><XCircle className="h-4 w-4" /> Certificate not found or revoked.</div>
        )}
        {state === "ok" && cert && (
          <div className="space-y-2 text-sm">
            <Badge variant="default" className="mx-auto"><ShieldCheck className="h-3 w-3 mr-1" /> Verified</Badge>
            <div><b>{(cert.profiles as any)?.full_name ?? "Learner"}</b></div>
            <div className="text-muted-foreground">{(cert.academy_learning_paths as any)?.title}</div>
            <div>Score: {cert.final_score}%</div>
            <div className="text-xs text-muted-foreground">Issued {new Date(cert.issued_at).toLocaleDateString()}</div>
            <div className="font-mono text-[10px] text-muted-foreground break-all">{code}</div>
          </div>
        )}
      </Card>
    </div>
  );
}
