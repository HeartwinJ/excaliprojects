import type { RequestHandler } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "../db/pool.js";
import { config } from "../config.js";

const PgStore = ConnectPgSimple(session);

const useSecureCookie = config.publicUrl.protocol === "https:";

export const sessionMiddleware: RequestHandler = session({
  name: "excaliprojects.sid",
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: new PgStore({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: true,
  }),
  cookie: {
    httpOnly: true,
    secure: useSecureCookie,
    sameSite: "lax",
    maxAge: config.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  },
});

declare module "express-session" {
  interface SessionData {
    userId?: string;
    csrfInitialised?: boolean;
  }
}
