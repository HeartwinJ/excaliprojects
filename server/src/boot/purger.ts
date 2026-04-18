import { purgeExpiredTrash } from "../repos/trash.js";
import { logger } from "../logger.js";

const RETENTION_DAYS = 30;
const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let timer: NodeJS.Timeout | undefined;

export function startTrashPurger(): void {
  const run = async (): Promise<void> => {
    try {
      const { projects, boards } = await purgeExpiredTrash(RETENTION_DAYS);
      if (projects + boards > 0) {
        logger.info({ projects, boards }, "purged expired trash");
      }
    } catch (err) {
      logger.error({ err }, "trash purge failed");
    }
  };

  void run();
  timer = setInterval(() => void run(), INTERVAL_MS);
  timer.unref?.();
}

export function stopTrashPurger(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}
