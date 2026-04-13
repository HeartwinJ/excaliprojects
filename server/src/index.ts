import express from "express";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { runMigrations } from "./db/migrate.js";
import { pool } from "./db/pool.js";
import { sessionMiddleware } from "./http/session.js";
import { securityHeaders } from "./http/security.js";
import { healthRouter } from "./http/health.js";

async function main(): Promise<void> {
  await runMigrations();

  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(pinoHttp({ logger }));
  app.use(securityHeaders);
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser(config.SESSION_SECRET));
  app.use(sessionMiddleware);

  app.use(healthRouter);

  app.get("/api/ping", (req, res) => {
    if (!req.session.userId) {
      res.status(401).json({ error: "unauthenticated" });
      return;
    }
    res.json({ ok: true });
  });

  const server = app.listen(config.APP_PORT, () => {
    logger.info({ port: config.APP_PORT }, "server listening");
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "shutting down");
    server.close();
    await pool.end().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error({ err }, "fatal startup error");
  process.exit(1);
});
