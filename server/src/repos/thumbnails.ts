import { pool } from "../db/pool.js";

export async function setBoardThumbnailPath(
  boardId: string,
  ownerId: string,
  path: string | null
): Promise<boolean> {
  const result = await pool.query(
    `update boards b set thumbnail_path = $3
     from projects p
     where b.id = $1 and p.id = b.project_id and p.owner_id = $2
       and b.deleted_at is null and p.deleted_at is null`,
    [boardId, ownerId, path]
  );
  return (result.rowCount ?? 0) > 0;
}
