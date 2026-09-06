import type { Pool } from "pg";
import type { AreaAction } from "@/lib/area-rights";
import type { AreaRightRecord, IAreaRightsRepository } from "@/lib/providers/interfaces";

interface Row {
  user_id: string;
  company_id: string;
  area_key: string;
  action: AreaAction;
  granted: boolean;
  granted_by: string | null;
}

const mapRow = (row: Row): AreaRightRecord => ({
  userId: row.user_id,
  companyId: row.company_id,
  areaKey: row.area_key,
  action: row.action,
  granted: row.granted,
  grantedBy: row.granted_by,
});

export function createPgAreaRightsRepository({ pool }: { pool: Pool }): IAreaRightsRepository {
  return {
    async listForUser(companyId, userId) {
      const { rows } = await pool.query<Row>(
        `SELECT user_id, company_id, area_key, action, granted, granted_by
           FROM public.user_area_rights WHERE company_id=$1 AND user_id=$2
          ORDER BY area_key, action`,
        [companyId, userId],
      );
      return rows.map(mapRow);
    },
    async listCatalog() {
      const { rows } = await pool.query<{ area_key: string; action: AreaAction; permission_key: string }>(
        `SELECT area_key, action, permission_key FROM public.area_permission_map ORDER BY area_key, action`,
      );
      return rows.map((row) => ({ areaKey: row.area_key, action: row.action, permissionKey: row.permission_key }));
    },
    async findByPermission(userId, permissionKey) {
      const { rows } = await pool.query<Row>(
        `SELECT r.user_id, r.company_id, r.area_key, r.action, r.granted, r.granted_by
           FROM public.user_area_rights r
           JOIN public.area_permission_map m ON m.area_key=r.area_key AND m.action=r.action
          WHERE r.user_id=$1 AND m.permission_key=$2 LIMIT 1`,
        [userId, permissionKey],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async replaceForUser(companyId, userId, rights, grantedBy) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM public.user_area_rights WHERE company_id=$1 AND user_id=$2", [companyId, userId]);
        for (const right of rights) {
          await client.query(
            `INSERT INTO public.user_area_rights (user_id,company_id,area_key,action,granted,granted_by)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [userId, companyId, right.area, right.action, right.granted, grantedBy],
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}