import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { IRbacAdminRepository } from "@/lib/providers/interfaces";

export function createSupabaseRbacAdminRepository(client:SupabaseClient<Database>):IRbacAdminRepository{return{
  async listPermissions(){const{data,error}=await client.from("role_permissions").select("permission");if(error)throw new Error(error.message);return Array.from(new Set((data??[]).map((r:any)=>r.permission))).map((key)=>({key,label:key,category:key.split(".")[0],description:null}));},
  async listRoles(){const{data,error}=await client.from("role_permissions").select("role,permission");if(error)throw new Error(error.message);const map=new Map<string,string[]>();for(const r of data??[]){const list=map.get(r.role)??[];list.push(r.permission);map.set(r.role,list);}return["admin","manager","supervisor","operator","viewer","team_leader","employee"].map((key)=>({key,name:key.replaceAll("_"," ").replace(/\b\w/g,(c)=>c.toUpperCase()),description:null,isSystem:true,isProtected:key==="admin",permissions:map.get(key)??[]}));},
  async createRole(){throw new Error("Custom roles are available in Self-Hosted installations");},async updateRole(){throw new Error("Custom roles are available in Self-Hosted installations");},async deleteRole(){throw new Error("Custom roles are available in Self-Hosted installations");}
};}