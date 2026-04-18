import { Router } from "express";
import { z } from "zod";
import {
  createShareLink,
  getActiveShareForBoard,
  getBoardByToken,
  revokeShareLink,
} from "../../repos/share.js";
import { config } from "../../config.js";
import { doubleCsrfProtection } from "../csrf.js";
import { requireAuth } from "./auth.js";

export const shareRouter = Router();

function publicUrlFor(token: string): string {
  const base = config.PUBLIC_APP_URL.replace(/\/+$/, "");
  return `${base}/s/${token}`;
}

shareRouter.get("/api/boards/:id/share", requireAuth, async (req, res) => {
  const share = await getActiveShareForBoard(req.params.id!, req.session.userId!);
  if (!share) {
    res.status(404).json({ error: "no active share" });
    return;
  }
  res.json({
    id: share.id,
    token: share.token,
    url: publicUrlFor(share.token),
    expires_at: share.expires_at,
    created_at: share.created_at,
  });
});

const shareSchema = z.object({
  expiresInDays: z.number().int().positive().max(3650).optional(),
});

shareRouter.post(
  "/api/boards/:id/share",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    if (!config.SHARE_LINKS_ENABLED) {
      res.status(403).json({ error: "share links disabled" });
      return;
    }
    const parsed = shareSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "invalid payload" });
      return;
    }
    const expiresAt =
      parsed.data.expiresInDays !== undefined
        ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
        : null;
    const share = await createShareLink(
      req.params.id!,
      req.session.userId!,
      expiresAt
    );
    if (!share) {
      res.status(404).json({ error: "board not found" });
      return;
    }
    res.status(201).json({
      id: share.id,
      token: share.token,
      url: publicUrlFor(share.token),
      expires_at: share.expires_at,
      created_at: share.created_at,
    });
  }
);

shareRouter.delete(
  "/api/boards/:id/share",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    const ok = await revokeShareLink(req.params.id!, req.session.userId!);
    if (!ok) {
      res.status(404).json({ error: "no active share" });
      return;
    }
    res.status(204).end();
  }
);

// Public read-only endpoint — no auth.
shareRouter.get("/api/share/:token", async (req, res) => {
  const data = await getBoardByToken(req.params.token!);
  if (!data) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json({
    name: data.name,
    scene_json: data.scene_json,
    updated_at: data.updated_at,
  });
});
