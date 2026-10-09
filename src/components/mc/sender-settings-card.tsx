import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useSenderSettings, type SenderSettings } from "@/hooks/use-sender-settings";

const PROVIDERS = [
  { key: "default", label: "Aplicația de mail a dispozitivului" },
  { key: "gmail", label: "Gmail" },
  { key: "outlook", label: "Outlook / Hotmail" },
  { key: "yahoo", label: "Yahoo" },
  { key: "icloud", label: "iCloud (aplicația Mail)" },
];

export function SenderSettingsCard() {
  const { settings, save } = useSenderSettings();
  const [f, setF] = useState<SenderSettings>(settings);
  useEffect(() => setF(settings), [settings]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Adresa mea pentru clienți</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Poți folosi adresa personală (Gmail, Yahoo, iCloud, Outlook) și WhatsApp-ul tău. Kai
          pregătește mesajul și îl deschide în contul tău — tu apeși „Trimite”. Nimic nu pleacă
          automat.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Adresa de e-mail</label>
            <Input
              type="email"
              value={f.sender_email ?? ""}
              onChange={(e) => setF({ ...f, sender_email: e.target.value || null })}
              placeholder="nume@gmail.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Furnizor</label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={f.email_provider}
              onChange={(e) => setF({ ...f, email_provider: e.target.value })}
            >
              {PROVIDERS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Număr WhatsApp</label>
            <Input
              value={f.whatsapp_number ?? ""}
              onChange={(e) => setF({ ...f, whatsapp_number: e.target.value || null })}
              placeholder="+40 7xx xxx xxx"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={f.kai_may_compose}
            onCheckedChange={(v) => setF({ ...f, kai_may_compose: v === true })}
          />
          Îi permit lui Kai să deschidă mesaje pregătite în contul meu
        </label>
        <Button
          disabled={save.isPending}
          onClick={() =>
            save.mutate(f, {
              onSuccess: () => toast.success("Setări salvate"),
              onError: (e) => toast.error(e instanceof Error ? e.message : "Nu s-a putut salva"),
            })
          }
        >
          Salvează
        </Button>
      </CardContent>
    </Card>
  );
}
