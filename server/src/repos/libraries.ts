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

interface LibraryItemShape {
  id: string;
  status: "published" | "unpublished";
  created: number;
  name?: string;
  elements: unknown[];
}

function stableItemId(libraryId: string, index: number): string {
  return `lib-${libraryId}-${index}`;
}

/**
 * Merge every library the user has into a single list of `libraryItems`
 * in Excalidraw's v2 shape. Handles:
 *   - v2 `.excalidrawlib`: `{ libraryItems: [ { id, status, elements, created } ] }`
 *   - v1 `.excalidrawlib`: `{ library: [ [elements], [elements] ] }` — converted.
 *   - Items lacking `status` / `created` — filled with sensible defaults so
 *     Excalidraw accepts them.
 */
export async function getMergedLibraryItems(
  ownerId: string
): Promise<LibraryItemShape[]> {
  const { rows } = await pool.query<{
    id: string;
    data_json: {
      libraryItems?: unknown[];
      library?: unknown[];
    } | null;
  }>(
    "select id, data_json from libraries where owner_id = $1 order by updated_at desc",
    [ownerId]
  );

  const items: LibraryItemShape[] = [];
  for (const row of rows) {
    const lib = row.data_json;
    if (!lib) continue;

    if (Array.isArray(lib.libraryItems)) {
      lib.libraryItems.forEach((raw, i) => {
        if (!raw || typeof raw !== "object") return;
        const item = raw as Partial<LibraryItemShape> & { elements?: unknown };
        if (!Array.isArray(item.elements)) return;
        items.push({
          id:
            typeof item.id === "string" && item.id.length > 0
              ? item.id
              : stableItemId(row.id, i),
          status: item.status === "published" ? "published" : "unpublished",
          created: typeof item.created === "number" ? item.created : Date.now(),
          name: typeof item.name === "string" ? item.name : undefined,
          elements: item.elements,
        });
      });
    } else if (Array.isArray(lib.library)) {
      // v1 format — each entry is a bare element group; lift into v2 shape.
      lib.library.forEach((group, i) => {
        if (!Array.isArray(group)) return;
        items.push({
          id: stableItemId(row.id, i),
          status: "unpublished",
          created: Date.now(),
          elements: group,
        });
      });
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
