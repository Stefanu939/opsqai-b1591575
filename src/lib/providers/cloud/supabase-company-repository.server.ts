// Cloud ICompanyRepository — wraps public.companies.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import type { CompanyRecord, ICompanyRepository } from "@/lib/providers/interfaces";

type Client = SupabaseClient<Database>;

interface Row {
  id: string;
  name: string;
  is_system: boolean | null;
  active: boolean | null;
  created_at: string;
}

function mapRow(r: Row): CompanyRecord {
  return {
    id: r.id,
    name: r.name,
    isSystem: !!r.is_system,
    active: r.active !== false,
    createdAt: r.created_at,
  };
}

export function createSupabaseCompanyRepository(client: Client): ICompanyRepository {
  return {
    async findById(id) {
      const { data, error } = await client
        .from("companies")
        .select("id, name, is_system, active, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRow(data as Row) : null;
    },
    async findSystemCompany() {
      const { data, error } = await client
        .from("companies")
        .select("id, name, is_system, active, created_at")
        .eq("is_system", true)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRow(data as Row) : null;
    },
    async findFirstActive() {
      const { data, error } = await client
        .from("companies")
        .select("id, name, is_system, active, created_at")
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRow(data as Row) : null;
    },
    async list() {
      const { data, error } = await client
        .from("companies")
        .select("id, name, is_system, active, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => mapRow(r as Row));
    },
  };
}
