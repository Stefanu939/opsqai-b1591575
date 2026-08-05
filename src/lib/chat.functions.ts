import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { getDirectMessageRepository } from "@/lib/providers/registry";
import { uuidString } from "@/lib/zod-uuid";

export type ChatContact = { id:string; full_name:string; email:string; avatar_url:string|null; is_staff:boolean; is_colleague:boolean };
export type ChatAttachment = { path:string; name:string; mime:string; size:number };
export type ChatMessage = { id:string; conversation_id:string; sender_id:string; body:string|null; attachments:ChatAttachment[]; created_at:string; edited_at:string|null; deleted_at:string|null };
export type ChatConversation = { id:string; created_at:string; last_message_at:string; peer:ChatContact|null; last_message:{body:string|null;created_at:string;sender_id:string;has_attachments:boolean}|null; unread_count:number };

const uuid=uuidString();
const attachment=z.object({path:z.string().min(1).max(400),name:z.string().min(1).max(200),mime:z.string().min(1).max(200),size:z.number().int().min(0).max(25*1024*1024)});
const contactDto=(r:{id:string;fullName:string;email:string;avatarUrl:string|null;isStaff:boolean;isColleague:boolean}):ChatContact=>({id:r.id,full_name:r.fullName,email:r.email,avatar_url:r.avatarUrl,is_staff:r.isStaff,is_colleague:r.isColleague});
const messageDto=(r:{id:string;conversationId:string;senderId:string;body:string|null;attachments:unknown[];createdAt:string;editedAt:string|null;deletedAt:string|null}):ChatMessage=>({id:r.id,conversation_id:r.conversationId,sender_id:r.senderId,body:r.body,attachments:r.attachments as ChatAttachment[],created_at:r.createdAt,edited_at:r.editedAt,deleted_at:r.deletedAt});

export const searchChatContacts=createServerFn({method:"POST"}).middleware([requireAuth]).inputValidator((d:unknown)=>z.object({q:z.string().min(1).max(120)}).parse(d)).handler(async({data,context})=>(await getDirectMessageRepository(context.supabase).searchContacts(context.userId,data.q,15)).map(contactDto));
export const listMyConversations=createServerFn({method:"GET"}).middleware([requireAuth]).handler(async({context}):Promise<ChatConversation[]> => (await getDirectMessageRepository(context.supabase).listConversations(context.userId)).map((r)=>({id:r.id,created_at:r.createdAt,last_message_at:r.lastMessageAt,peer:r.peer?contactDto(r.peer):null,last_message:r.lastMessage?{body:r.lastMessage.body,created_at:r.lastMessage.createdAt,sender_id:r.lastMessage.senderId,has_attachments:r.lastMessage.hasAttachments}:null,unread_count:r.unreadCount})));
export const startDirectConversation=createServerFn({method:"POST"}).middleware([requireAuth]).inputValidator((d:unknown)=>z.object({target_user_id:uuid}).parse(d)).handler(async({data,context})=>({conversation_id:await getDirectMessageRepository(context.supabase).findOrCreate(context.userId,data.target_user_id)}));
export const listMessages=createServerFn({method:"POST"}).middleware([requireAuth]).inputValidator((d:unknown)=>z.object({conversation_id:uuid,before:z.string().datetime().optional(),limit:z.number().int().min(1).max(100).default(50)}).parse(d)).handler(async({data,context})=>(await getDirectMessageRepository(context.supabase).listMessages(context.userId,data.conversation_id,data.before??null,data.limit)).map(messageDto));
export const sendMessage=createServerFn({method:"POST"}).middleware([requireAuth]).inputValidator((d:unknown)=>z.object({conversation_id:uuid,body:z.string().trim().max(4000).optional(),attachments:z.array(attachment).max(10).default([])}).refine((v)=>Boolean(v.body?.length)||v.attachments.length>0,{message:"empty_message"}).parse(d)).handler(async({data,context})=>messageDto(await getDirectMessageRepository(context.supabase).send(context.userId,{conversationId:data.conversation_id,body:data.body??null,attachments:data.attachments})));
export const markConversationRead=createServerFn({method:"POST"}).middleware([requireAuth]).inputValidator((d:unknown)=>z.object({conversation_id:uuid}).parse(d)).handler(async({data,context})=>{await getDirectMessageRepository(context.supabase).markRead(context.userId,data.conversation_id);return{ok:true};});
export const signChatAttachment=createServerFn({method:"POST"}).middleware([requireAuth]).inputValidator((d:unknown)=>z.object({path:z.string().min(1).max(400)}).parse(d)).handler(async()=>{throw new Error("Message attachments are not enabled on this installation");});
export const createChatUploadUrl=createServerFn({method:"POST"}).middleware([requireAuth]).inputValidator((d:unknown)=>z.object({conversation_id:uuid,filename:z.string().min(1).max(200)}).parse(d)).handler(async()=>{throw new Error("Message attachments are not enabled on this installation");});
