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
 *
 * Every item is forced to `status: "unpublished"` so the editor shows a
 * single "Personal Library" section rather than splitting items between
 * "Personal Library" and "Excalidraw Library" based on the file's origin.
 * This is a self-hosted, single-user app — the community/registry split
 * Excalidraw draws is just noise here.
 *
 * The source-library grouping (e.g. "Flowchart essentials" vs "UI wireframes")
 * is surfaced on the /libraries page instead, where the names make sense.
 */
export async function getMergedLibraryItems(
  ownerId: string
): Promise<LibraryItemShape[]> {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    data_json: {
      libraryItems?: unknown[];
      library?: unknown[];
    } | null;
  }>(
    // Alphabetical by library name so each library's items stay contiguous
    // in the Excalidraw panel — a cheap approximation of grouping, since
    // the built-in panel doesn't support header rows between items.
    "select id, name, data_json from libraries where owner_id = $1 order by name asc",
    [ownerId]
  );

  const items: LibraryItemShape[] = [];
  for (const row of rows) {
    const lib = row.data_json;
    if (!lib) continue;
    const libName = row.name;

    if (Array.isArray(lib.libraryItems)) {
      lib.libraryItems.forEach((raw, i) => {
        if (!raw || typeof raw !== "object") return;
        const item = raw as Partial<LibraryItemShape> & { elements?: unknown };
        if (!Array.isArray(item.elements)) return;
        const rawName =
          typeof item.name === "string" && item.name.length > 0
            ? item.name
            : `#${i + 1}`;
        items.push({
          id:
            typeof item.id === "string" && item.id.length > 0
              ? item.id
              : stableItemId(row.id, i),
          status: "unpublished",
          created: typeof item.created === "number" ? item.created : Date.now(),
          // Prefix with the source library so hovers/tooltips make the
          // origin obvious even though Excalidraw can't render headers.
          name: `${libName} · ${rawName}`,
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
          name: `${libName} · #${i + 1}`,
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

/**
 * Items for a single library, normalised to v2 shape + coerced to
 * `unpublished` status (see `getMergedLibraryItems` for the rationale).
 */
export async function getLibraryItems(
  id: string,
  ownerId: string
): Promise<LibraryItemShape[] | undefined> {
  const lib = await getLibrary(id, ownerId);
  if (!lib) return undefined;
  const data = lib.data_json as {
    libraryItems?: unknown[];
    library?: unknown[];
  } | null;
  if (!data) return [];

  const items: LibraryItemShape[] = [];
  if (Array.isArray(data.libraryItems)) {
    data.libraryItems.forEach((raw, i) => {
      if (!raw || typeof raw !== "object") return;
      const item = raw as Partial<LibraryItemShape> & { elements?: unknown };
      if (!Array.isArray(item.elements)) return;
      items.push({
        id:
          typeof item.id === "string" && item.id.length > 0
            ? item.id
            : stableItemId(lib.id, i),
        status: "unpublished",
        created: typeof item.created === "number" ? item.created : Date.now(),
        name:
          typeof item.name === "string" && item.name.length > 0
            ? item.name
            : undefined,
        elements: item.elements,
      });
    });
  } else if (Array.isArray(data.library)) {
    data.library.forEach((group, i) => {
      if (!Array.isArray(group)) return;
      items.push({
        id: stableItemId(lib.id, i),
        status: "unpublished",
        created: Date.now(),
        elements: group,
      });
    });
  }
  return items;
}
