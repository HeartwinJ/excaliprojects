import { pool } from "../db/pool.js";

export interface TagRecord {
  id: string;
  name: string;
}

export async function listTagsForOwner(ownerId: string): Promise<TagRecord[]> {
  const { rows } = await pool.query<TagRecord>(
    "select id, name from tags where owner_id = $1 order by name asc",
    [ownerId]
  );
  return rows;
}

// ————————————————————————————————————————————————————————————————
// Board tags

export async function listTagsForBoard(
  boardId: string,
  ownerId: string
): Promise<TagRecord[]> {
  const { rows } = await pool.query<TagRecord>(
    `select t.id, t.name
     from tags t
     join board_tags bt on bt.tag_id = t.id
     join boards b on b.id = bt.board_id
     join projects p on p.id = b.project_id
     where b.id = $1 and p.owner_id = $2 and t.owner_id = $2
       and b.deleted_at is null and p.deleted_at is null
     order by t.name asc`,
    [boardId, ownerId]
  );
  return rows;
}

export async function listTagsForBoards(
  boardIds: string[],
  ownerId: string
): Promise<Map<string, TagRecord[]>> {
  const result = new Map<string, TagRecord[]>();
  if (boardIds.length === 0) return result;
  const { rows } = await pool.query<{
    board_id: string;
    id: string;
    name: string;
  }>(
    `select bt.board_id, t.id, t.name
     from board_tags bt
     join tags t on t.id = bt.tag_id
     where bt.board_id = any($1::uuid[]) and t.owner_id = $2
     order by t.name asc`,
    [boardIds, ownerId]
  );
  for (const row of rows) {
    const list = result.get(row.board_id) ?? [];
    list.push({ id: row.id, name: row.name });
    result.set(row.board_id, list);
  }
  return result;
}

export async function setBoardTags(
  boardId: string,
  ownerId: string,
  tagNames: string[]
): Promise<TagRecord[]> {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const check = await client.query(
      `select 1 from boards b join projects p on p.id = b.project_id
       where b.id = $1 and p.owner_id = $2
         and b.deleted_at is null and p.deleted_at is null`,
      [boardId, ownerId]
    );
    if ((check.rowCount ?? 0) === 0) {
      await client.query("rollback");
      throw new Error("board not found");
    }

    const normalised = Array.from(
      new Set(tagNames.map((n) => n.trim()).filter(Boolean))
    );

    const tagIds: string[] = [];
    for (const name of normalised) {
      const { rows } = await client.query<{ id: string }>(
        `insert into tags (owner_id, name) values ($1, $2)
         on conflict (owner_id, name) do update set name = excluded.name
         returning id`,
        [ownerId, name]
      );
      tagIds.push(rows[0]!.id);
    }

    await client.query("delete from board_tags where board_id = $1", [boardId]);
    for (const tagId of tagIds) {
      await client.query(
        "insert into board_tags (board_id, tag_id) values ($1, $2) on conflict do nothing",
        [boardId, tagId]
      );
    }

    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }

  return listTagsForBoard(boardId, ownerId);
}

// ————————————————————————————————————————————————————————————————
// Project tags (mirror of the board-tags API, backed by `project_tags`)

export async function listTagsForProject(
  projectId: string,
  ownerId: string
): Promise<TagRecord[]> {
  const { rows } = await pool.query<TagRecord>(
    `select t.id, t.name
     from tags t
     join project_tags pt on pt.tag_id = t.id
     join projects p on p.id = pt.project_id
     where p.id = $1 and p.owner_id = $2 and t.owner_id = $2
       and p.deleted_at is null
     order by t.name asc`,
    [projectId, ownerId]
  );
  return rows;
}

export async function listTagsForProjects(
  projectIds: string[],
  ownerId: string
): Promise<Map<string, TagRecord[]>> {
  const result = new Map<string, TagRecord[]>();
  if (projectIds.length === 0) return result;
  const { rows } = await pool.query<{
    project_id: string;
    id: string;
    name: string;
  }>(
    `select pt.project_id, t.id, t.name
     from project_tags pt
     join tags t on t.id = pt.tag_id
     where pt.project_id = any($1::uuid[]) and t.owner_id = $2
     order by t.name asc`,
    [projectIds, ownerId]
  );
  for (const row of rows) {
    const list = result.get(row.project_id) ?? [];
    list.push({ id: row.id, name: row.name });
    result.set(row.project_id, list);
  }
  return result;
}

export async function setProjectTags(
  projectId: string,
  ownerId: string,
  tagNames: string[]
): Promise<TagRecord[]> {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const check = await client.query(
      `select 1 from projects
       where id = $1 and owner_id = $2 and deleted_at is null`,
      [projectId, ownerId]
    );
    if ((check.rowCount ?? 0) === 0) {
      await client.query("rollback");
      throw new Error("project not found");
    }

    const normalised = Array.from(
      new Set(tagNames.map((n) => n.trim()).filter(Boolean))
    );

    const tagIds: string[] = [];
    for (const name of normalised) {
      const { rows } = await client.query<{ id: string }>(
        `insert into tags (owner_id, name) values ($1, $2)
         on conflict (owner_id, name) do update set name = excluded.name
         returning id`,
        [ownerId, name]
      );
      tagIds.push(rows[0]!.id);
    }

    await client.query("delete from project_tags where project_id = $1", [
      projectId,
    ]);
    for (const tagId of tagIds) {
      await client.query(
        "insert into project_tags (project_id, tag_id) values ($1, $2) on conflict do nothing",
        [projectId, tagId]
      );
    }

    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }

  return listTagsForProject(projectId, ownerId);
}
