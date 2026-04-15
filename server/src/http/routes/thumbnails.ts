import path from "node:path";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { Router, raw } from "express";
import { config } from "../../config.js";
import { findBoardById } from "../../repos/boards.js";
import { setBoardThumbnailPath } from "../../repos/thumbnails.js";
import { doubleCsrfProtection } from "../csrf.js";
import { requireAuth } from "./auth.js";

export const thumbnailsRouter = Router();

const thumbDir = path.resolve(config.FILES_DIR, "thumbnails");

async function ensureDir(): Promise<void> {
  if (!existsSync(thumbDir)) {
    await mkdir(thumbDir, { recursive: true });
  }
}

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB is plenty for a ~400×300 PNG.

thumbnailsRouter.put(
  "/api/boards/:id/thumbnail",
  requireAuth,
  doubleCsrfProtection,
  raw({ type: "image/png", limit: MAX_BYTES }),
  async (req, res) => {
    const board = await findBoardById(req.params.id!, req.session.userId!);
    if (!board) {
      res.status(404).json({ error: "not found" });
      return;
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "expected image/png body" });
      return;
    }

    // Quick magic-byte check: PNG files start with 89 50 4E 47 0D 0A 1A 0A.
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!req.body.subarray(0, 8).equals(signature)) {
      res.status(400).json({ error: "not a png" });
      return;
    }

    await ensureDir();
    const filename = `${board.id}.png`;
    const filepath = path.join(thumbDir, filename);
    await writeFile(filepath, req.body);

    const relative = `/api/boards/${board.id}/thumbnail?v=${Date.now()}`;
    await setBoardThumbnailPath(board.id, req.session.userId!, relative);
    res.json({ thumbnail_path: relative });
  }
);

thumbnailsRouter.get("/api/boards/:id/thumbnail", requireAuth, async (req, res) => {
  const board = await findBoardById(req.params.id!, req.session.userId!);
  if (!board) {
    res.status(404).end();
    return;
  }
  const filepath = path.join(thumbDir, `${board.id}.png`);
  try {
    const info = await stat(filepath);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    res.setHeader("Content-Length", String(info.size));
    res.sendFile(filepath);
  } catch {
    res.status(404).end();
  }
});
