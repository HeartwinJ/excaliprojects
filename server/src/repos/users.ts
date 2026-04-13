import argon2 from "argon2";
import { pool } from "../db/pool.js";

export interface UserRecord {
  id: string;
  username: string;
  password_hash: string;
  theme_preference: "system" | "light" | "dark";
  created_at: Date;
}

export async function countUsers(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>("select count(*)::text as count from users");
  return Number(rows[0]?.count ?? "0");
}

export async function findUserById(id: string): Promise<UserRecord | undefined> {
  const { rows } = await pool.query<UserRecord>("select * from users where id = $1", [id]);
  return rows[0];
}

export async function findUserByUsername(username: string): Promise<UserRecord | undefined> {
  const { rows } = await pool.query<UserRecord>(
    "select * from users where username = $1",
    [username]
  );
  return rows[0];
}

export async function createUser(username: string, password: string): Promise<UserRecord> {
  const password_hash = await argon2.hash(password, { type: argon2.argon2id });
  const { rows } = await pool.query<UserRecord>(
    `insert into users (username, password_hash) values ($1, $2) returning *`,
    [username, password_hash]
  );
  return rows[0]!;
}

export async function verifyPassword(user: UserRecord, password: string): Promise<boolean> {
  try {
    return await argon2.verify(user.password_hash, password);
  } catch {
    return false;
  }
}

export async function updateThemePreference(
  userId: string,
  theme: UserRecord["theme_preference"]
): Promise<void> {
  await pool.query("update users set theme_preference = $1 where id = $2", [theme, userId]);
}
