// Integration connection logic (server-only).
//
// OPSQAI does not broker OAuth for Outlook / Gmail. The two mail providers are
// wired through the "Inbox Companion" browser extension plus the private ICS
// calendar feed, and Microsoft Teams through an incoming-webhook URL. This
// module persists that connection state through the integration repository, so
// both Cloud and Self-Hosted share one code path.

export type IntegrationProvider = "outlook" | "gmail" | "teams";

export interface ConnectInput {
  provider: IntegrationProvider;
  /** Teams incoming webhook (required for `teams`). */
  webhookUrl?: string | null;
  /** How the mail provider was linked. */
  method?: "companion" | "calendar" | null;
  accountEmail?: string | null;
}

interface Ctx {
  supabase: unknown;
  userId: string;
}

async function repoFor(context: unknown) {
  const ctx = context as Ctx;
  const [{ resolveDashboardCompany }, { getIntegrationRepository }] = await Promise.all([
    import("@/lib/dashboard-search.server"),
    import("@/lib/providers/registry"),
  ]);
  const { companyId } = await resolveDashboardCompany(ctx as never, null);
  return { companyId, repo: getIntegrationRepository(ctx.supabase), userId: ctx.userId };
}

export async function connectIntegration(context: unknown, input: ConnectInput) {
  const { companyId, repo, userId } = await repoFor(context);

  if (input.provider === "teams") {
    const url = (input.webhookUrl ?? "").trim();
    if (!/^https:\/\/[^\s]+$/i.test(url)) {
      throw new Error("Enter the full https:// Teams incoming-webhook URL.");
    }
  }

  const config: Record<string, unknown> = {
    method: input.provider === "teams" ? "webhook" : (input.method ?? "companion"),
  };
  if (input.provider === "teams") config['webhookUrl'] = (input.webhookUrl ?? "").trim();
  if (input.accountEmail) config['accountEmail'] = input.accountEmail.trim();

  await repo.upsert({
    companyId,
    provider: input.provider,
    status: "connected",
    config,
    connectedAt: new Date().toISOString(),
    connectedBy: userId,
  });

  return { ok: true as const, provider: input.provider };
}

export async function disconnectIntegration(context: unknown, provider: IntegrationProvider) {
  const { companyId, repo } = await repoFor(context);
  await repo.update(companyId, provider, { status: "disconnected", config: {}, lastError: null });
  return { ok: true as const, provider };
}
