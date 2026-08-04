import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requireAnyPermission } from "@/lib/authorization";
import { getRbacAdminRepository } from "@/lib/providers/registry";

const key=z.string().regex(/^[a-z][a-z0-9_]{1,63}$/);
const roleInput=z.object({key,name:z.string().trim().min(2).max(80),description:z.string().trim().max(300).nullish(),permissions:z.array(z.string().min(2).max(100)).max(200)});
export const listRbacConfiguration=createServerFn({method:"GET"}).middleware([requireAuth]).handler(async({context})=>{await requireAnyPermission(context,["role.manage","platform.manage"]);const repo=getRbacAdminRepository(context.supabase);const [roles,permissions]=await Promise.all([repo.listRoles(),repo.listPermissions()]);return{roles,permissions};});
export const createCustomRole=createServerFn({method:"POST"}).middleware([requireAuth]).inputValidator((d:unknown)=>roleInput.parse(d)).handler(async({data,context})=>{await requireAnyPermission(context,["role.manage","platform.manage"]);await getRbacAdminRepository(context.supabase).createRole(data);return{ok:true};});
export const updateCustomRole=createServerFn({method:"POST"}).middleware([requireAuth]).inputValidator((d:unknown)=>roleInput.parse(d)).handler(async({data,context})=>{await requireAnyPermission(context,["role.manage","platform.manage"]);await getRbacAdminRepository(context.supabase).updateRole(data.key,data);return{ok:true};});
export const deleteCustomRole=createServerFn({method:"POST"}).middleware([requireAuth]).inputValidator((d:unknown)=>z.object({key}).parse(d)).handler(async({data,context})=>{await requireAnyPermission(context,["role.manage","platform.manage"]);await getRbacAdminRepository(context.supabase).deleteRole(data.key);return{ok:true};});