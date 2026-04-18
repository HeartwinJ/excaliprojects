import { Router } from "express";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { doubleCsrfProtection } from "../csrf.js";
import { requireAuth } from "./auth.js";

export const backupRouter = Router();

interface ExportShape {
  version: 1;
  exported_at: string;
  projects: Array<{
    id: string;
    name: string;
    position: number;
    created_at: string;
    boards: Array<{
      id: string;
      name: string;
      scene_json: unknown;
      is_favorite: boolean;
      created_at: string;
      updated_at: string;
      tags: string[];
      checkpoints: Array<{ label: string | null; scene_json: unknown; created_at: string }>;
    }>;
  }>;
  libraries: Array<{ name: string; data: unknown }>;
}

backupRouter.get("/api/export-all", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const { rows: projects } = await pool.query<{
    id: string;
    name: string;
    position: number;
    created_at: Date;
  }>(
    `select id, name, position, created_at from projects
     where owner_id = $1 and deleted_at is null order by position, created_at`,
    [userId]
  );

  const { rows: boards } = await pool.query<{
    id: string;
    project_id: string;
    name: string;
    scene_json: unknown;
    is_favorite: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    `select b.id, b.project_id, b.name, b.scene_json, b.is_favorite, b.created_at, b.updated_at
     from boards b join projects p on p.id = b.project_id
     where p.owner_id = $1 and b.deleted_at is null and p.deleted_at is null`,
    [userId]
  );

  const { rows: tagRows } = await pool.query<{ board_id: string; name: string }>(
    `select bt.board_id, t.name from board_tags bt
     join tags t on t.id = bt.tag_id
     join boards b on b.id = bt.board_id
     join projects p on p.id = b.project_id
     where t.owner_id = $1 and b.deleted_at is null and p.deleted_at is null`,
    [userId]
  );

  const { rows: checkpointRows } = await pool.query<{
    board_id: string;
    label: string | null;
    scene_json: unknown;
    created_at: Date;
  }>(
    `select v.board_id, v.label, v.scene_json, v.created_at
     from board_versions v
     join boards b on b.id = v.board_id
     join projects p on p.id = b.project_id
     where p.owner_id = $1 and v.is_checkpoint = true
       and b.deleted_at is null and p.deleted_at is null`,
    [userId]
  );

  const { rows: libs } = await pool.query<{ name: string; data_json: unknown }>(
    "select name, data_json from libraries where owner_id = $1",
    [userId]
  );

  const boardTags = new Map<string, string[]>();
  for (const r of tagRows) {
    const arr = boardTags.get(r.board_id) ?? [];
    arr.push(r.name);
    boardTags.set(r.board_id, arr);
  }

  const boardCheckpoints = new Map<
    string,
    Array<{ label: string | null; scene_json: unknown; created_at: string }>
  >();
  for (const r of checkpointRows) {
    const arr = boardCheckpoints.get(r.board_id) ?? [];
    arr.push({
      label: r.label,
      scene_json: r.scene_json,
      created_at: r.created_at.toISOString(),
    });
    boardCheckpoints.set(r.board_id, arr);
  }

  const shape: ExportShape = {
    version: 1,
    exported_at: new Date().toISOString(),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      created_at: p.created_at.toISOString(),
      boards: boards
        .filter((b) => b.project_id === p.id)
        .map((b) => ({
          id: b.id,
          name: b.name,
          scene_json: b.scene_json,
          is_favorite: b.is_favorite,
          created_at: b.created_at.toISOString(),
          updated_at: b.updated_at.toISOString(),
          tags: boardTags.get(b.id) ?? [],
          checkpoints: boardCheckpoints.get(b.id) ?? [],
        })),
    })),
    libraries: libs.map((l) => ({ name: l.name, data: l.data_json })),
  };

  const filename = `excaliprojects-backup-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(JSON.stringify(shape));
});

const restoreSchema = z.object({
  version: z.literal(1),
  projects: z.array(
    z.object({
      name: z.string(),
      position: z.number().int().optional(),
      boards: z.array(
        z.object({
          name: z.string(),
          scene_json: z.unknown(),
          is_favorite: z.boolean().optional(),
          tags: z.array(z.string()).optional(),
          checkpoints: z
            .array(
              z.object({
                label: z.string().nullable(),
                scene_json: z.unknown(),
              })
            )
            .optional(),
        })
      ),
    })
  ),
  libraries: z
    .array(z.object({ name: z.string(), data: z.unknown() }))
    .optional(),
});

backupRouter.post(
  "/api/restore",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    const parsed = restoreSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid backup payload" });
      return;
    }
    const userId = req.session.userId!;
    const client = await pool.connect();
    try {
      await client.query("begin");

      let created = { projects: 0, boards: 0, libraries: 0 };

      for (const proj of parsed.data.projects) {
        const { rows } = await client.query<{ id: string }>(
          `insert into projects (owner_id, name, position)
           values ($1, $2, coalesce($3, coalesce(
             (select max(position) + 1 from projects where owner_id = $1 and deleted_at is null), 0)))
           returning id`,
          [userId, proj.name, proj.position ?? null]
        );
        const projectId = rows[0]!.id;
        created.projects++;

        for (const board of proj.boards) {
          const {
            rows: [b],
          } = await client.query<{ id: string }>(
            `insert into boards (project_id, name, scene_json, is_favorite)
             values ($1, $2, $3::jsonb, $4) returning id`,
            [projectId, board.name, JSON.stringify(board.scene_json ?? {}), board.is_favorite ?? false]
          );
          if (!b) continue;
          created.boards++;

          for (const name of board.tags ?? []) {
            const {
              rows: [t],
            } = await client.query<{ id: string }>(
              `insert into tags (owner_id, name) values ($1, $2)
               on conflict (owner_id, name) do update set name = excluded.name
               returning id`,
              [userId, name]
            );
            if (t) {
              await client.query(
                "insert into board_tags (board_id, tag_id) values ($1, $2) on conflict do nothing",
                [b.id, t.id]
              );
            }
          }

          for (const cp of board.checkpoints ?? []) {
            await client.query(
              `insert into board_versions (board_id, scene_json, label, is_checkpoint)
               values ($1, $2::jsonb, $3, true)`,
              [b.id, JSON.stringify(cp.scene_json), cp.label]
            );
          }
        }
      }

      for (const lib of parsed.data.libraries ?? []) {
        await client.query(
          `insert into libraries (owner_id, name, data_json) values ($1, $2, $3::jsonb)`,
          [userId, lib.name, JSON.stringify(lib.data)]
        );
        created.libraries++;
      }

      await client.query("commit");
      res.json({ ok: true, created });
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }
);
