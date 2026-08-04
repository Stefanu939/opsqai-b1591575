import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { IAiAuditRepository } from "@/lib/providers/interfaces";
export function createSupabaseAiAuditRepository(client:SupabaseClient<Database>):IAiAuditRepository{return{
  async list(companyId,limit){const{data,error}=await client.from("ai_audits").select("id,score,maturity,passed,warnings,critical,summary,created_at").eq("company_id",companyId).order("created_at",{ascending:false}).limit(limit);if(error)throw new Error(error.message);return(data??[]).map((r)=>({id:r.id,score:r.score,maturity:r.maturity,passed:r.passed,warnings:r.warnings,critical:r.critical,summary:r.summary,createdAt:r.created_at}));},
  async create(input){const{data,error}=await client.from("ai_audits").insert({company_id:input.companyId,requested_by:input.requestedBy,score:input.score,maturity:input.maturity,summary:input.summary,passed:input.passed,warnings:input.warnings,critical:input.critical} as never).select("id").single();if(error)throw new Error(error.message);return data;}
};}