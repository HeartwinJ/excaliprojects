import { pool } from "../db/pool.js";

export interface BoardRecord {
  id: string;
  project_id: string;
  name: string;
  scene_json: unknown;
  thumbnail_path: string | null;
  is_favorite: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export type BoardSummary = Omit<BoardRecord, "scene_json"> & { save_count?: number };

function summaryColumns(alias = ""): string {
  const p = alias ? `${alias}.` : "";
  return [
    `${p}id`,
    `${p}project_id`,
    `${p}name`,
    `${p}thumbnail_path`,
    `${p}is_favorite`,
    `${p}created_at`,
    `${p}updated_at`,
    `${p}deleted_at`,
  ].join(", ");
}

export async function listBoardsInProject(
  projectId: string,
  ownerId: string
): Promise<BoardSummary[]> {
  const { rows } = await pool.query<BoardSummary>(
    `select ${summaryColumns("b")}
     from boards b
     join projects p on p.id = b.project_id
     where b.project_id = $1 and p.owner_id = $2
       and b.deleted_at is null and p.deleted_at is null
     order by b.is_favorite desc, b.updated_at desc`,
    [projectId, ownerId]
  );
  return rows;
}

export async function listRecentBoards(
  ownerId: string,
  limit = 12
): Promise<BoardSummary[]> {
  const { rows } = await pool.query<BoardSummary>(
    `select ${summaryColumns("b")}
     from boards b
     join projects p on p.id = b.project_id
     where p.owner_id = $1 and b.deleted_at is null and p.deleted_at is null
     order by b.updated_at desc
     limit $2`,
    [ownerId, limit]
  );
  return rows;
}

export async function findBoardById(
  id: string,
  ownerId: string
): Promise<BoardRecord | undefined> {
  const { rows } = await pool.query<BoardRecord>(
    `select b.*
     from boards b
     join projects p on p.id = b.project_id
     where b.id = $1 and p.owner_id = $2
       and b.deleted_at is null and p.deleted_at is null`,
    [id, ownerId]
  );
  return rows[0];
}

export async function createBoard(
  projectId: string,
  ownerId: string,
  name: string
): Promise<BoardSummary | undefined> {
  const { rows } = await pool.query<BoardSummary>(
    `insert into boards (project_id, name)
     select $1, $3 from projects
     where id = $1 and owner_id = $2 and deleted_at is null
     returning ${summaryColumns()}`,
    [projectId, ownerId, name]
  );
  return rows[0];
}

export async function duplicateBoard(
  id: string,
  ownerId: string
): Promise<BoardSummary | undefined> {
  const { rows } = await pool.query<BoardSummary>(
    `insert into boards (project_id, name, scene_json, is_favorite)
     select b.project_id, b.name || ' (copy)', b.scene_json, false
     from boards b
     join projects p on p.id = b.project_id
     where b.id = $1 and p.owner_id = $2
       and b.deleted_at is null and p.deleted_at is null
     returning ${summaryColumns()}`,
    [id, ownerId]
  );
  return rows[0];
}

export async function renameBoard(
  id: string,
  ownerId: string,
  name: string
): Promise<BoardSummary | undefined> {
  const { rows } = await pool.query<BoardSummary>(
    `update boards b set name = $3, updated_at = now()
     from projects p
     where b.id = $1 and p.id = b.project_id and p.owner_id = $2
       and b.deleted_at is null and p.deleted_at is null
     returning ${summaryColumns("b")}`,
    [id, ownerId, name]
  );
  return rows[0];
}

export async function moveBoard(
  id: string,
  ownerId: string,
  newProjectId: string
): Promise<BoardSummary | undefined> {
  const { rows } = await pool.query<BoardSummary>(
    `update boards b set project_id = $3, updated_at = now()
     from projects src, projects dst
     where b.id = $1 and src.id = b.project_id and src.owner_id = $2
       and dst.id = $3 and dst.owner_id = $2
       and b.deleted_at is null and src.deleted_at is null and dst.deleted_at is null
     returning ${summaryColumns("b")}`,
    [id, ownerId, newProjectId]
  );
  return rows[0];
}

export async function setBoardFavourite(
  id: string,
  ownerId: string,
  favourite: boolean
): Promise<BoardSummary | undefined> {
  const { rows } = await pool.query<BoardSummary>(
    `update boards b set is_favorite = $3, updated_at = now()
     from projects p
     where b.id = $1 and p.id = b.project_id and p.owner_id = $2
       and b.deleted_at is null and p.deleted_at is null
     returning ${summaryColumns("b")}`,
    [id, ownerId, favourite]
  );
  return rows[0];
}

export async function saveBoardScene(
  id: string,
  ownerId: string,
  scene: unknown
): Promise<(BoardSummary & { save_count: number }) | undefined> {
  const { rows } = await pool.query<BoardSummary & { save_count: number }>(
    `update boards b set
        scene_json = $3::jsonb,
        save_count = b.save_count + 1,
        updated_at = now()
     from projects p
     where b.id = $1 and p.id = b.project_id and p.owner_id = $2
       and b.deleted_at is null and p.deleted_at is null
     returning ${summaryColumns("b")}, b.save_count`,
    [id, ownerId, JSON.stringify(scene)]
  );
  return rows[0];
}

export async function softDeleteBoard(id: string, ownerId: string): Promise<boolean> {
  const result = await pool.query(
    `update boards b set deleted_at = now()
     from projects p
     where b.id = $1 and p.id = b.project_id and p.owner_id = $2
       and b.deleted_at is null and p.deleted_at is null`,
    [id, ownerId]
  );
  return (result.rowCount ?? 0) > 0;
}
