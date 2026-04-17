import { pool } from "../db/pool.js";
import { config } from "../config.js";

export interface VersionSummary {
  id: string;
  board_id: string;
  label: string | null;
  is_checkpoint: boolean;
  created_at: Date;
}

export interface VersionRecord extends VersionSummary {
  scene_json: unknown;
}

export async function maybeAutoSnapshot(
  boardId: string,
  scene: unknown,
  saveCount: number
): Promise<void> {
  if (saveCount % config.AUTOSNAPSHOT_EVERY_N_SAVES !== 0) return;

  await pool.query(
    `insert into board_versions (board_id, scene_json, is_checkpoint)
     values ($1, $2::jsonb, false)`,
    [boardId, JSON.stringify(scene)]
  );

  // Prune older auto snapshots beyond the cap.
  await pool.query(
    `delete from board_versions
     where id in (
       select id from board_versions
       where board_id = $1 and is_checkpoint = false
       order by created_at desc
       offset $2
     )`,
    [boardId, config.MAX_AUTOSNAPSHOTS_PER_BOARD]
  );
}

export async function createCheckpoint(
  boardId: string,
  ownerId: string,
  label: string | null
): Promise<VersionSummary | undefined> {
  const { rows } = await pool.query<VersionSummary>(
    `insert into board_versions (board_id, scene_json, label, is_checkpoint)
     select b.id, b.scene_json, $3, true
     from boards b
     join projects p on p.id = b.project_id
     where b.id = $1 and p.owner_id = $2
       and b.deleted_at is null and p.deleted_at is null
     returning id, board_id, label, is_checkpoint, created_at`,
    [boardId, ownerId, label]
  );
  return rows[0];
}

export async function listVersions(
  boardId: string,
  ownerId: string
): Promise<VersionSummary[]> {
  const { rows } = await pool.query<VersionSummary>(
    `select v.id, v.board_id, v.label, v.is_checkpoint, v.created_at
     from board_versions v
     join boards b on b.id = v.board_id
     join projects p on p.id = b.project_id
     where v.board_id = $1 and p.owner_id = $2
       and b.deleted_at is null and p.deleted_at is null
     order by v.created_at desc`,
    [boardId, ownerId]
  );
  return rows;
}

export async function getVersion(
  versionId: string,
  ownerId: string
): Promise<VersionRecord | undefined> {
  const { rows } = await pool.query<VersionRecord>(
    `select v.*
     from board_versions v
     join boards b on b.id = v.board_id
     join projects p on p.id = b.project_id
     where v.id = $1 and p.owner_id = $2
       and b.deleted_at is null and p.deleted_at is null`,
    [versionId, ownerId]
  );
  return rows[0];
}

export async function restoreVersion(
  versionId: string,
  ownerId: string
): Promise<boolean> {
  const v = await getVersion(versionId, ownerId);
  if (!v) return false;
  const result = await pool.query(
    `update boards set scene_json = $2::jsonb, updated_at = now()
     where id = $1`,
    [v.board_id, JSON.stringify(v.scene_json)]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteCheckpoint(
  versionId: string,
  ownerId: string
): Promise<boolean> {
  const result = await pool.query(
    `delete from board_versions v
     using boards b, projects p
     where v.id = $1 and b.id = v.board_id and p.id = b.project_id
       and p.owner_id = $2 and v.is_checkpoint = true`,
    [versionId, ownerId]
  );
  return (result.rowCount ?? 0) > 0;
}
