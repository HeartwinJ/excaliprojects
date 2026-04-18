import { pool } from "../db/pool.js";

export interface TrashedProject {
  kind: "project";
  id: string;
  name: string;
  deleted_at: Date;
}

export interface TrashedBoard {
  kind: "board";
  id: string;
  name: string;
  project_id: string;
  project_name: string;
  project_deleted_at: Date | null;
  deleted_at: Date;
}

export type TrashedItem = TrashedProject | TrashedBoard;

export async function listTrash(ownerId: string): Promise<TrashedItem[]> {
  const { rows: projectRows } = await pool.query<TrashedProject>(
    `select 'project'::text as kind, id, name, deleted_at
     from projects
     where owner_id = $1 and deleted_at is not null
     order by deleted_at desc`,
    [ownerId]
  );
  const { rows: boardRows } = await pool.query<TrashedBoard>(
    `select 'board'::text as kind, b.id, b.name, b.project_id,
            p.name as project_name, p.deleted_at as project_deleted_at,
            b.deleted_at
     from boards b
     join projects p on p.id = b.project_id
     where p.owner_id = $1 and b.deleted_at is not null
     order by b.deleted_at desc`,
    [ownerId]
  );
  return [...projectRows, ...boardRows];
}

export async function restoreProject(id: string, ownerId: string): Promise<boolean> {
  const result = await pool.query(
    "update projects set deleted_at = null where id = $1 and owner_id = $2 and deleted_at is not null",
    [id, ownerId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function restoreBoard(id: string, ownerId: string): Promise<boolean> {
  const result = await pool.query(
    `update boards b set deleted_at = null
     from projects p
     where b.id = $1 and p.id = b.project_id and p.owner_id = $2
       and b.deleted_at is not null and p.deleted_at is null`,
    [id, ownerId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function permanentDeleteProject(
  id: string,
  ownerId: string
): Promise<boolean> {
  const result = await pool.query(
    "delete from projects where id = $1 and owner_id = $2 and deleted_at is not null",
    [id, ownerId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function permanentDeleteBoard(id: string, ownerId: string): Promise<boolean> {
  const result = await pool.query(
    `delete from boards b
     using projects p
     where b.id = $1 and p.id = b.project_id and p.owner_id = $2
       and b.deleted_at is not null`,
    [id, ownerId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function purgeExpiredTrash(retentionDays: number): Promise<{
  projects: number;
  boards: number;
}> {
  const boards = await pool.query(
    `delete from boards where deleted_at is not null and deleted_at < now() - ($1 || ' days')::interval`,
    [String(retentionDays)]
  );
  const projects = await pool.query(
    `delete from projects where deleted_at is not null and deleted_at < now() - ($1 || ' days')::interval`,
    [String(retentionDays)]
  );
  return { projects: projects.rowCount ?? 0, boards: boards.rowCount ?? 0 };
}
