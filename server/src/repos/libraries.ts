import { pool } from "../db/pool.js";

export interface LibrarySummary {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface LibraryRecord extends LibrarySummary {
  data_json: unknown;
}

export async function listLibraries(ownerId: string): Promise<LibrarySummary[]> {
  const { rows } = await pool.query<LibrarySummary>(
    "select id, name, created_at, updated_at from libraries where owner_id = $1 order by name asc",
    [ownerId]
  );
  return rows;
}

export async function getMergedLibraryItems(ownerId: string): Promise<unknown[]> {
  const { rows } = await pool.query<{ data_json: { libraryItems?: unknown[] } }>(
    "select data_json from libraries where owner_id = $1 order by updated_at desc",
    [ownerId]
  );
  const items: unknown[] = [];
  for (const row of rows) {
    const lib = row.data_json;
    if (lib && Array.isArray(lib.libraryItems)) {
      items.push(...lib.libraryItems);
    }
  }
  return items;
}

export async function createLibrary(
  ownerId: string,
  name: string,
  data: unknown
): Promise<LibrarySummary> {
  const { rows } = await pool.query<LibrarySummary>(
    `insert into libraries (owner_id, name, data_json)
     values ($1, $2, $3::jsonb)
     returning id, name, created_at, updated_at`,
    [ownerId, name, JSON.stringify(data)]
  );
  return rows[0]!;
}

export async function deleteLibrary(id: string, ownerId: string): Promise<boolean> {
  const result = await pool.query(
    "delete from libraries where id = $1 and owner_id = $2",
    [id, ownerId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getLibrary(
  id: string,
  ownerId: string
): Promise<LibraryRecord | undefined> {
  const { rows } = await pool.query<LibraryRecord>(
    "select id, name, data_json, created_at, updated_at from libraries where id = $1 and owner_id = $2",
    [id, ownerId]
  );
  return rows[0];
}
