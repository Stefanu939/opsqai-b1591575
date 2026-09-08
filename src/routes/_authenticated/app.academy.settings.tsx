import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { AcademySubnav } from "@/components/app/academy-subnav";
import { getCertificateBranding, saveCertificateBranding } from "@/lib/academy.functions";

export const Route = createFileRoute("/_authenticated/app/academy/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Academy Settings · Certificate branding" },
      {
        name: "description",
        content:
          "Configure Academy certificate branding: company logo, authorized signature and the certificate verification address.",
      },
    ],
  }),
});

type Branding = {
  signatureName: string;
  signatureRole: string;
  hasLogo: boolean;
  hasSignature: boolean;
  verifyBaseUrl: string;
};

async function fileToBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const b of buf) binary += String.fromCharCode(b);
  return btoa(binary);
}

function SettingsPage() {
  const load = useServerFn(getCertificateBranding);
  const save = useServerFn(saveCertificateBranding);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [busy, setBusy] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [signature, setSignature] = useState<File | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const row = (await load({ data: {} })) as Branding;
        setBranding(row);
      } catch {
        setBranding({
          signatureName: "",
          signatureRole: "",
          hasLogo: false,
          hasSignature: false,
          verifyBaseUrl: "",
        });
      }
    })();
  }, [load]);

  async function onSave() {
    if (!branding) return;
    setBusy(true);
    try {
      await save({
        data: {
          signatureName: branding.signatureName,
          signatureRole: branding.signatureRole,
          verifyBaseUrl: branding.verifyBaseUrl,
          logoBase64: logo ? await fileToBase64(logo) : undefined,
          signatureBase64: signature ? await fileToBase64(signature) : undefined,
        },
      });
      setLogo(null);
      setSignature(null);
      const row = (await load({ data: {} })) as Branding;
      setBranding(row);
      toast.success("Certificate branding saved. New certificates use it immediately.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save branding");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(kind: "logo" | "signature") {
    setBusy(true);
    try {
      await save({
        data: kind === "logo" ? { removeLogo: true } : { removeSignature: true },
      });
      const row = (await load({ data: {} })) as Branding;
      setBranding(row);
      toast.success("Removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <AcademySubnav />
      <div className="p-6 max-w-3xl mx-auto w-full space-y-4">
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2 font-medium">
            <Settings className="h-5 w-5 text-primary" /> Academy Settings
          </div>
          <p className="text-sm text-muted-foreground">
            Configure global passing scores, quiz length, retraining triggers and role assignments
            in the Manager Console.
          </p>
          <Link
            to="/app/academy/teacher"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            Open Manager Console <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-5 w-5 text-primary" /> Certificate branding
            </div>
            <p className="text-sm text-muted-foreground">
              Your logo and an authorized signature are printed on every certificate. PNG or JPEG,
              max 1.5 MB each.
            </p>
          </div>

          {!branding ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Company logo {branding.hasLogo ? "(set)" : "(not set)"}</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                  />
                  {branding.hasLogo && (
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => void onRemove("logo")}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Signature image {branding.hasSignature ? "(set)" : "(not set)"}</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => setSignature(e.target.files?.[0] ?? null)}
                  />
                  {branding.hasSignature && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void onRemove("signature")}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="sig-name">Signed by</Label>
                  <Input
                    id="sig-name"
                    value={branding.signatureName}
                    placeholder="Maria Ionescu"
                    onChange={(e) => setBranding({ ...branding, signatureName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sig-role">Role / title</Label>
                  <Input
                    id="sig-role"
                    value={branding.signatureRole}
                    placeholder="Operations Manager"
                    onChange={(e) => setBranding({ ...branding, signatureRole: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="verify-url">Verification address (QR code)</Label>
                <Input
                  id="verify-url"
                  value={branding.verifyBaseUrl}
                  placeholder="https://opsqai.company.local"
                  onChange={(e) => setBranding({ ...branding, verifyBaseUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  The QR code on the certificate points to this address, followed by
                  <code className="mx-1">/verify/&lt;certificate&nbsp;id&gt;</code>. Use the address
                  where this installation is reachable, otherwise scanning shows “Certificate not
                  found”.
                </p>
              </div>

              <Button disabled={busy} onClick={() => void onSave()}>
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save branding
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
