import { fileURLToPath } from "node:url";
import { runner } from "node-pg-migrate";
import { config } from "../config.js";
import { logger } from "../logger.js";

const migrationsDir = fileURLToPath(new URL("../../migrations", import.meta.url));

export async function runMigrations(): Promise<void> {
  logger.info({ migrationsDir }, "running migrations");

  await runner({
    databaseUrl: config.databaseUrl,
    dir: migrationsDir,
    migrationsTable: "pgmigrations",
    direction: "up",
    verbose: !config.isProd,
    singleTransaction: true,
    checkOrder: true,
    log: (msg: string) => logger.info(msg),
  });

  logger.info("migrations complete");
}
