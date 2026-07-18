// Cloud IDepartmentRepository — wraps public.departments + nullifies
// profiles.department_id on delete for FK-less consistency.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import type {
  DepartmentRecord,
  IDepartmentRepository,
} from "@/lib/providers/interfaces";

type Client = SupabaseClient<Database>;

interface Row {
  id: string;
  name: string;
  company_id: string | null;
}

const mapRow = (r: Row): DepartmentRecord => ({
  id: r.id,
  name: r.name,
  companyId: r.company_id,
});

export function createSupabaseDepartmentRepository(client: Client): IDepartmentRepository {
  return {
    async list(companyId) {
      let q = client.from("departments").select("id, name, company_id").order("name");
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => mapRow(r as Row));
    },
    async findByNameCI(companyId, name) {
      const { data, error } = await client
        .from("departments")
        .select("id, name, company_id")
        .eq("company_id", companyId)
        .ilike("name", name)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRow(data as Row) : null;
    },
    async create(input) {
      const { data, error } = await client
        .from("departments")
        .insert({ name: input.name, company_id: input.companyId })
        .select("id, name, company_id")
        .single();
      if (error) throw error;
      return mapRow(data as Row);
    },
    async delete(id, companyId) {
      const { data: existing, error: e1 } = await client
        .from("departments")
        .select("id, company_id")
        .eq("id", id)
        .maybeSingle();
      if (e1) throw e1;
      if (!existing || (existing as Row).company_id !== companyId) {
        throw new Error("department not found");
      }
      await client.from("profiles").update({ department_id: null }).eq("department_id", id);
      const { error } = await client.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
  };
}
