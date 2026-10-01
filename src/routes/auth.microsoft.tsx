import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/microsoft")({
  head: () => ({
    meta: [
      { title: "Microsoft sign-in — OPSQAI" },
      { name: "description", content: "Completing sign-in with your Microsoft work account." },
      { property: "og:title", content: "Microsoft sign-in — OPSQAI" },
      { property: "og:description", content: "Completing sign-in with your Microsoft work account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MicrosoftCallback,
});

function MicrosoftCallback() {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const code = new URLSearchParams(window.location.hash.slice(1)).get("code");
    history.replaceState(null, "", "/auth/microsoft");
    if (!code) {
      window.location.replace("/auth?sso_error=invalid_request");
      return;
    }
    void (async () => {
      try {
        const res = await fetch("/api/auth/microsoft/exchange", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (!res.ok) throw new Error("exchange_failed");
        const s = await res.json();
        // Same storage the password sign-in uses; reload picks the session up.
        window.localStorage.setItem("opsqai.session", JSON.stringify(s));
        window.location.replace("/app");
      } catch {
        setError("Sign-in could not be completed.");
        setTimeout(() => window.location.replace("/auth?sso_error=verification_failed"), 1500);
      }
    })();
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      {error ? <p>{error}</p> : <Loader2 className="h-6 w-6 animate-spin" aria-label="Signing in" />}
    </div>
  );
}
