import crypto from "node:crypto";
import { pool } from "../db/pool.js";

export interface ShareLinkRecord {
  id: string;
  board_id: string;
  token: string;
  expires_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
}

function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function getActiveShareForBoard(
  boardId: string,
  ownerId: string
): Promise<ShareLinkRecord | undefined> {
  const { rows } = await pool.query<ShareLinkRecord>(
    `select s.*
     from share_links s
     join boards b on b.id = s.board_id
     join projects p on p.id = b.project_id
     where b.id = $1 and p.owner_id = $2 and s.revoked_at is null
       and b.deleted_at is null and p.deleted_at is null
     order by s.created_at desc
     limit 1`,
    [boardId, ownerId]
  );
  return rows[0];
}

export async function createShareLink(
  boardId: string,
  ownerId: string,
  expiresAt: Date | null
): Promise<ShareLinkRecord | undefined> {
  // Ensure board belongs to owner first.
  const check = await pool.query(
    `select 1 from boards b join projects p on p.id = b.project_id
     where b.id = $1 and p.owner_id = $2
       and b.deleted_at is null and p.deleted_at is null`,
    [boardId, ownerId]
  );
  if ((check.rowCount ?? 0) === 0) return undefined;

  // Revoke any existing active share.
  await pool.query(
    `update share_links set revoked_at = now()
     where board_id = $1 and revoked_at is null`,
    [boardId]
  );

  const { rows } = await pool.query<ShareLinkRecord>(
    `insert into share_links (board_id, token, expires_at)
     values ($1, $2, $3)
     returning *`,
    [boardId, generateToken(), expiresAt]
  );
  return rows[0];
}

export async function revokeShareLink(
  boardId: string,
  ownerId: string
): Promise<boolean> {
  const result = await pool.query(
    `update share_links s set revoked_at = now()
     from boards b, projects p
     where s.board_id = $1 and b.id = s.board_id and p.id = b.project_id
       and p.owner_id = $2 and s.revoked_at is null`,
    [boardId, ownerId]
  );
  return (result.rowCount ?? 0) > 0;
}

export interface PublicBoardPayload {
  name: string;
  scene_json: unknown;
  updated_at: Date;
}

export async function getBoardByToken(token: string): Promise<PublicBoardPayload | undefined> {
  const { rows } = await pool.query<PublicBoardPayload>(
    `select b.name, b.scene_json, b.updated_at
     from share_links s
     join boards b on b.id = s.board_id
     join projects p on p.id = b.project_id
     where s.token = $1 and s.revoked_at is null
       and (s.expires_at is null or s.expires_at > now())
       and b.deleted_at is null and p.deleted_at is null`,
    [token]
  );
  return rows[0];
}
