import type { Pool, PoolClient } from "pg";
import type { DirectMessageRecord, IDirectMessageRepository, JsonLike } from "@/lib/providers/interfaces";
import { toIso, toIsoOrNull } from "./dates";

function message(row: { id:string; conversation_id:string; sender_id:string; body:string|null;
  attachments: JsonLike[]; created_at:Date; edited_at:Date|null; deleted_at:Date|null }): DirectMessageRecord {
  return { id:row.id, conversationId:row.conversation_id, senderId:row.sender_id, body:row.body,
    attachments:row.attachments ?? [], createdAt:toIso(row.created_at),
    editedAt:toIsoOrNull(row.edited_at), deletedAt:toIsoOrNull(row.deleted_at) };
}
async function member(db: Pool | PoolClient, userId: string, conversationId: string) {
  const { rows } = await db.query("SELECT 1 FROM public.direct_conversation_members WHERE user_id=$1 AND conversation_id=$2", [userId, conversationId]);
  if (!rows.length) throw new Error("Forbidden");
}
export function createPgDirectMessageRepository({ pool }: { pool: Pool }): IDirectMessageRepository {
  return {
    async searchContacts(userId, query, limit) {
      const q = `%${query.trim().toLowerCase()}%`;
      const { rows } = await pool.query<{ id:string; full_name:string|null; email:string; avatar_url:string|null; is_staff:boolean }>(
        `SELECT u.id, COALESCE(u.full_name,u.display_name,u.email) full_name, u.email, u.avatar_url,
                EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=u.id AND ur.role='admin') is_staff
           FROM public.users u WHERE u.id<>$1 AND NOT u.disabled AND u.is_active
            AND (lower(COALESCE(u.full_name,'')) LIKE $2 OR lower(u.email) LIKE $2)
           ORDER BY full_name LIMIT $3`, [userId,q,limit]);
      return rows.map((r) => ({ id:r.id, fullName:r.full_name ?? r.email, email:r.email,
        avatarUrl:r.avatar_url, isStaff:r.is_staff, isColleague:true }));
    },
    async listConversations(userId) {
      const { rows } = await pool.query<{
        id:string; created_at:Date; last_message_at:Date; peer_id:string|null; peer_name:string|null;
        peer_email:string|null; peer_avatar:string|null; last_body:string|null; last_created_at:Date|null;
        last_sender_id:string|null; has_attachments:boolean; unread_count:string;
      }>(`SELECT c.id,c.created_at,c.last_message_at,p.id peer_id,
                 COALESCE(p.full_name,p.display_name,p.email) peer_name,p.email peer_email,p.avatar_url peer_avatar,
                 lm.body last_body,lm.created_at last_created_at,lm.sender_id last_sender_id,
                 COALESCE(jsonb_array_length(lm.attachments)>0,FALSE) has_attachments,
                 (SELECT count(*) FROM public.direct_messages um WHERE um.conversation_id=c.id
                   AND um.sender_id<>$1 AND um.created_at>me.last_read_at)::text unread_count
            FROM public.direct_conversation_members me
            JOIN public.direct_conversations c ON c.id=me.conversation_id
       LEFT JOIN public.direct_conversation_members pm ON pm.conversation_id=c.id AND pm.user_id<>$1
       LEFT JOIN public.users p ON p.id=pm.user_id
       LEFT JOIN LATERAL (SELECT * FROM public.direct_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) lm ON TRUE
           WHERE me.user_id=$1 ORDER BY c.last_message_at DESC`, [userId]);
      return rows.map((r) => ({ id:r.id,createdAt:toIso(r.created_at),lastMessageAt:toIso(r.last_message_at),
        peer:r.peer_id?{id:r.peer_id,fullName:r.peer_name ?? r.peer_email ?? "",email:r.peer_email ?? "",avatarUrl:r.peer_avatar,isStaff:false,isColleague:true}:null,
        lastMessage:r.last_created_at?{body:r.last_body,createdAt:toIso(r.last_created_at),senderId:r.last_sender_id ?? "",hasAttachments:r.has_attachments}:null,
        unreadCount:Number(r.unread_count) }));
    },
    async findOrCreate(userId, targetUserId) {
      if (userId === targetUserId) throw new Error("Cannot message yourself");
      const exists = await pool.query("SELECT 1 FROM public.users WHERE id=$1 AND NOT disabled AND is_active", [targetUserId]);
      if (!exists.rows.length) throw new Error("User not found");
      const current = await pool.query<{ id:string }>(`SELECT c.id FROM public.direct_conversations c
        JOIN public.direct_conversation_members a ON a.conversation_id=c.id AND a.user_id=$1
        JOIN public.direct_conversation_members b ON b.conversation_id=c.id AND b.user_id=$2
        WHERE (SELECT count(*) FROM public.direct_conversation_members x WHERE x.conversation_id=c.id)=2 LIMIT 1`,[userId,targetUserId]);
      if (current.rows[0]) return current.rows[0].id;
      const client=await pool.connect();
      try { await client.query("BEGIN"); const created=await client.query<{id:string}>("INSERT INTO public.direct_conversations DEFAULT VALUES RETURNING id");
        const id=created.rows[0].id; await client.query("INSERT INTO public.direct_conversation_members (conversation_id,user_id) VALUES ($1,$2),($1,$3)",[id,userId,targetUserId]);
        await client.query("COMMIT"); return id; } catch(error){await client.query("ROLLBACK");throw error;} finally{client.release();}
    },
    async listMessages(userId, conversationId, before, limit) {
      await member(pool,userId,conversationId); const params:unknown[]=[conversationId,limit];
      const beforeSql=before?(params.push(before),`AND created_at < $${params.length}`):"";
      const { rows }=await pool.query<any>(`SELECT * FROM (SELECT id,conversation_id,sender_id,body,attachments,created_at,edited_at,deleted_at FROM public.direct_messages WHERE conversation_id=$1 ${beforeSql} ORDER BY created_at DESC LIMIT $2) q ORDER BY created_at`,params);
      return rows.map(message);
    },
    async send(userId,input) { await member(pool,userId,input.conversationId);
      const {rows}=await pool.query<any>(`INSERT INTO public.direct_messages (conversation_id,sender_id,body,attachments) VALUES ($1,$2,$3,$4::jsonb) RETURNING *`,[input.conversationId,userId,input.body,JSON.stringify(input.attachments)]);
      await pool.query("UPDATE public.direct_conversations SET last_message_at=NOW() WHERE id=$1",[input.conversationId]); return message(rows[0]); },
    async markRead(userId,conversationId){await member(pool,userId,conversationId);await pool.query("UPDATE public.direct_conversation_members SET last_read_at=NOW() WHERE user_id=$1 AND conversation_id=$2",[userId,conversationId]);},
  };
}