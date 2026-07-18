// Cloud IIntegrationRepository — wraps public.company_integrations.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  IIntegrationRepository,
  IntegrationRecord,
} from "@/lib/providers/interfaces";

type Client = SupabaseClient<Database>;

interface Row {
  company_id: string;
  provider: string;
  status: string;
  config: unknown;
  connected_at: string | null;
  last_error: string | null;
}

const mapRow = (r: Row): IntegrationRecord => ({
  companyId: r.company_id,
  provider: r.provider,
  status: r.status,
  config: (r.config ?? {}) as Record<string, unknown>,
  connectedAt: r.connected_at,
  lastError: r.last_error,
});

export function createSupabaseIntegrationRepository(client: Client): IIntegrationRepository {
  return {
    async find(companyId, provider) {
      const { data, error } = await client
        .from("company_integrations")
        .select("company_id, provider, status, config, connected_at, last_error")
        .eq("company_id", companyId)
        .eq("provider", provider)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapRow(data as unknown as Row) : null;
    },
    async upsert(input) {
      const { error } = await client.from("company_integrations").upsert(
        {
          company_id: input.companyId,
          provider: input.provider,
          status: input.status,
          config: input.config,
          connected_at: input.connectedAt,
          connected_by: input.connectedBy,
          last_error: null,
        },
        { onConflict: "company_id,provider" },
      );
      if (error) throw new Error(error.message);
    },
    async update(companyId, provider, patch) {
      const row: Record<string, unknown> = {};
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.config !== undefined) row.config = patch.config;
      if (patch.lastError !== undefined) row.last_error = patch.lastError;
      if (Object.keys(row).length === 0) return;
      const { error } = await client
        .from("company_integrations")
        .update(row)
        .eq("company_id", companyId)
        .eq("provider", provider);
      if (error) throw new Error(error.message);
    },
  };
}
