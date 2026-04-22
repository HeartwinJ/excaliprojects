import { pool } from "../db/pool.js";

export interface ProjectHit {
  kind: "project";
  id: string;
  name: string;
}

export interface BoardHit {
  kind: "board";
  id: string;
  name: string;
  project_id: string;
  project_name: string;
  thumbnail_path: string | null;
  tags: string[];
  updated_at: Date;
}

export type SearchHit = ProjectHit | BoardHit;

export async function search(ownerId: string, query: string): Promise<SearchHit[]> {
  const term = `%${query.replace(/[%_]/g, (c) => "\\" + c)}%`;

  const [{ rows: projectRows }, { rows: boardRows }] = await Promise.all([
    pool.query<{ id: string; name: string }>(
      `select distinct p.id, p.name from projects p
       left join project_tags pt on pt.project_id = p.id
       left join tags t on t.id = pt.tag_id and t.owner_id = $1
       where p.owner_id = $1 and p.deleted_at is null
         and (p.name ilike $2 or t.name ilike $2)
       order by p.name asc limit 20`,
      [ownerId, term]
    ),
    pool.query<{
      id: string;
      name: string;
      project_id: string;
      project_name: string;
      thumbnail_path: string | null;
      tags: string[] | null;
      updated_at: Date;
    }>(
      `select b.id, b.name, b.project_id, b.thumbnail_path, b.updated_at,
              p.name as project_name,
              coalesce(array_agg(distinct t.name) filter (where t.id is not null), '{}') as tags
       from boards b
       join projects p on p.id = b.project_id
       left join board_tags bt on bt.board_id = b.id
       left join tags t on t.id = bt.tag_id and t.owner_id = $1
       where p.owner_id = $1 and b.deleted_at is null and p.deleted_at is null
         and (b.name ilike $2 or p.name ilike $2 or t.name ilike $2)
       group by b.id, p.id
       order by b.updated_at desc
       limit 40`,
      [ownerId, term]
    ),
  ]);

  const projectHits: ProjectHit[] = projectRows.map((r) => ({
    kind: "project",
    id: r.id,
    name: r.name,
  }));

  const boardHits: BoardHit[] = boardRows.map((r) => ({
    kind: "board",
    id: r.id,
    name: r.name,
    project_id: r.project_id,
    project_name: r.project_name,
    thumbnail_path: r.thumbnail_path,
    tags: r.tags ?? [],
    updated_at: r.updated_at,
  }));

  return [...projectHits, ...boardHits];
}
