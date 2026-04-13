import { config } from "../config.js";
import { logger } from "../logger.js";
import { countUsers, createUser } from "../repos/users.js";

export async function seedInitialUser(): Promise<void> {
  const existing = await countUsers();
  if (existing > 0) {
    logger.info({ existing }, "users already present, skipping seed");
    return;
  }

  await createUser(config.SEED_USERNAME, config.SEED_PASSWORD);
  logger.info({ username: config.SEED_USERNAME }, "seeded initial user from env");
}
