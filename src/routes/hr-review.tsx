// External document verification page.
//
// Opened with a time-limited link by a lawyer / consultant outside the company.
// It shows exactly one document and accepts one verdict. Nothing else from the
// application is reachable from here.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LogoMark } from "@/components/brand/logo";

export const Route = createFileRoute("/hr-review")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Document verification — OPSQAI" },
      { name: "description", content: "Open one shared document, verify it or ask for changes." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Document verification — OPSQAI" },
      { property: "og:description", content: "Open one shared document, verify it or ask for changes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HrReviewPage,
});

type Loaded = { title: string; body: string; reviewerName: string | null; reviewerOrg: string | null };

function HrReviewPage() {
  const [token, setToken] = useState<string | null>(null);
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"reviewed" | "changes_requested" | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t);
    if (!t) {
      setInvalid(true);
      return;
    }
    void fetch(`/api/public/v1/hr/review?token=${encodeURIComponent(t)}`)
      .then(async (r) => (r.ok ? ((await r.json()) as Loaded & { ok: boolean }) : null))
      .then((d) => {
        if (!d) {
          setInvalid(true);
          return;
        }
        setDoc(d);
        setName(d.reviewerName ?? "");
      })
      .catch(() => setInvalid(true));
  }, []);

  const send = (verdict: "reviewed" | "changes_requested") => {
    if (!token) return;
    setBusy(true);
    void fetch("/api/public/v1/hr/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, verdict, notes, reviewerName: name }),
    })
      .then((r) => (r.ok ? setDone(verdict) : setInvalid(true)))
      .catch(() => setInvalid(true))
      .finally(() => setBusy(false));
  };

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-12">
      <div className="flex items-center gap-3">
        <LogoMark className="size-8" />
        <h1 className="text-xl font-semibold">Document verification</h1>
      </div>

      {invalid ? (
        <Card className="p-6 text-sm">
          This verification link is not valid any more. It may have expired, been withdrawn, or already
          been used. Ask the company for a new link.
        </Card>
      ) : done ? (
        <Card className="p-6 text-sm">
          {done === "reviewed"
            ? "Thank you — your verification has been recorded. The company can now approve the document."
            : "Thank you — your change request has been recorded and the document was sent back for editing."}
        </Card>
      ) : !doc ? (
        <Card className="h-64 animate-pulse p-6" />
      ) : (
        <>
          <Card className="grid gap-3 p-6">
            <h2 className="font-medium">{doc.title}</h2>
            <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-4 font-mono text-[13px] leading-relaxed">
              {doc.body}
            </pre>
          </Card>
          <Card className="grid gap-3 p-6">
            <label className="text-sm font-medium" htmlFor="reviewer">
              Your name and firm
            </label>
            <Input id="reviewer" value={name} onChange={(e) => setName(e.target.value)} />
            <label className="text-sm font-medium" htmlFor="notes">
              Note (optional)
            </label>
            <Textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy || name.trim().length < 2} onClick={() => send("reviewed")}>
                I verify and accept
              </Button>
              <Button
                variant="outline"
                disabled={busy || name.trim().length < 2}
                onClick={() => send("changes_requested")}
              >
                Request changes
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link opens only this document and can be used once.
            </p>
          </Card>
        </>
      )}
    </main>
  );
}
