import { pool } from "../db/pool.js";

export interface ProjectRecord {
  id: string;
  owner_id: string;
  name: string;
  position: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export async function listProjects(ownerId: string): Promise<ProjectRecord[]> {
  const { rows } = await pool.query<ProjectRecord>(
    `select * from projects
     where owner_id = $1 and deleted_at is null
     order by position asc, created_at asc`,
    [ownerId]
  );
  return rows;
}

export async function findProjectById(
  id: string,
  ownerId: string
): Promise<ProjectRecord | undefined> {
  const { rows } = await pool.query<ProjectRecord>(
    `select * from projects where id = $1 and owner_id = $2 and deleted_at is null`,
    [id, ownerId]
  );
  return rows[0];
}

export async function createProject(ownerId: string, name: string): Promise<ProjectRecord> {
  const { rows } = await pool.query<ProjectRecord>(
    `insert into projects (owner_id, name, position)
     values ($1, $2, coalesce(
       (select max(position) + 1 from projects where owner_id = $1 and deleted_at is null),
       0
     ))
     returning *`,
    [ownerId, name]
  );
  return rows[0]!;
}

export async function renameProject(
  id: string,
  ownerId: string,
  name: string
): Promise<ProjectRecord | undefined> {
  const { rows } = await pool.query<ProjectRecord>(
    `update projects set name = $3, updated_at = now()
     where id = $1 and owner_id = $2 and deleted_at is null
     returning *`,
    [id, ownerId, name]
  );
  return rows[0];
}

export async function reorderProjects(ownerId: string, ids: string[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (let i = 0; i < ids.length; i++) {
      await client.query(
        `update projects set position = $3, updated_at = now()
         where id = $1 and owner_id = $2 and deleted_at is null`,
        [ids[i], ownerId, i]
      );
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function softDeleteProject(id: string, ownerId: string): Promise<boolean> {
  const result = await pool.query(
    `update projects set deleted_at = now()
     where id = $1 and owner_id = $2 and deleted_at is null`,
    [id, ownerId]
  );
  return (result.rowCount ?? 0) > 0;
}
