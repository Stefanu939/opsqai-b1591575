import { Link } from "@tanstack/react-router";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Recognises the auth/permission failures thrown by server functions. */
export function isUnauthorizedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return /unauthorized|no authorization header|forbidden|not permitted|permission denied|\b401\b|\b403\b/i.test(
    msg,
  );
}

export interface RouteErrorStateProps {
  error: unknown;
  /** Where the "sign in again" / "go back" action should land. */
  homeTo?: string;
}

/**
 * Shared error surface for authenticated shells. An expired session or a
 * missing permission renders a readable state with a way out, instead of a
 * blank screen or a raw stack trace.
 */
export function RouteErrorState({ error, homeTo = "/app" }: RouteErrorStateProps) {
  const unauthorized = isUnauthorizedError(error);
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

  return (
    <div className="flex min-h-[60dvh] items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/40">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">
          {unauthorized ? "You don't have access to this" : "Something went wrong"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {unauthorized
            ? "Your session may have expired, or your role doesn't include this area. Sign in again or ask an administrator for access."
            : "This screen could not be loaded. Retry, and if it keeps failing contact your administrator."}
        </p>
        <p className="text-xs text-muted-foreground/70 font-mono break-all">{message}</p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Retry</span>
          </Button>
          {unauthorized ? (
            <Button asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={homeTo}>Go back</Link>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
