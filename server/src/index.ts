import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { runMigrations } from "./db/migrate.js";
import { pool } from "./db/pool.js";
import { sessionMiddleware } from "./http/session.js";
import { securityHeaders } from "./http/security.js";
import { healthRouter } from "./http/health.js";
import { authRouter, requireAuth } from "./http/routes/auth.js";
import { projectsRouter } from "./http/routes/projects.js";
import { boardsRouter } from "./http/routes/boards.js";
import { thumbnailsRouter } from "./http/routes/thumbnails.js";
import { tagsRouter } from "./http/routes/tags.js";
import { versionsRouter } from "./http/routes/versions.js";
import { librariesRouter } from "./http/routes/libraries.js";
import { trashRouter } from "./http/routes/trash.js";
import { startTrashPurger } from "./boot/purger.js";
import { invalidCsrfTokenError } from "./http/csrf.js";
import { seedInitialUser } from "./boot/seed.js";
import { mountClient } from "./http/static.js";

async function main(): Promise<void> {
  await runMigrations();
  await seedInitialUser();

  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(pinoHttp({ logger }));
  app.use(securityHeaders);
  app.use(express.json({ limit: `${config.MAX_UPLOAD_MB}mb` }));
  app.use(cookieParser(config.SESSION_SECRET));
  app.use(sessionMiddleware);

  app.use(healthRouter);
  app.use(authRouter);
  app.use(projectsRouter);
  app.use(boardsRouter);
  app.use(thumbnailsRouter);
  app.use(tagsRouter);
  app.use(versionsRouter);
  app.use(librariesRouter);
  app.use(trashRouter);

  startTrashPurger();

  app.get("/api/ping", requireAuth, (_req, res) => {
    res.json({ ok: true });
  });

  mountClient(app);

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err === invalidCsrfTokenError) {
      res.status(403).json({ error: "invalid csrf token" });
      return;
    }
    next(err);
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "unhandled error");
    res.status(500).json({ error: "internal server error" });
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
