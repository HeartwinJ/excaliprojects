import { Router } from "express";
import { z } from "zod";
import {
  createCheckpoint,
  deleteCheckpoint,
  getVersion,
  listVersions,
  restoreVersion,
} from "../../repos/versions.js";
import { doubleCsrfProtection } from "../csrf.js";
import { requireAuth } from "./auth.js";

export const versionsRouter = Router();

versionsRouter.get("/api/boards/:id/versions", requireAuth, async (req, res) => {
  const versions = await listVersions(req.params.id!, req.session.userId!);
  res.json(versions);
});

const checkpointSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
});

versionsRouter.post(
  "/api/boards/:id/versions",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    const parsed = checkpointSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "invalid payload" });
      return;
    }
    const v = await createCheckpoint(
      req.params.id!,
      req.session.userId!,
      parsed.data.label ?? null
    );
    if (!v) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.status(201).json(v);
  }
);

versionsRouter.get("/api/versions/:id", requireAuth, async (req, res) => {
  const v = await getVersion(req.params.id!, req.session.userId!);
  if (!v) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(v);
});

versionsRouter.post(
  "/api/versions/:id/restore",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    const ok = await restoreVersion(req.params.id!, req.session.userId!);
    if (!ok) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.status(204).end();
  }
);

versionsRouter.delete(
  "/api/versions/:id",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    const ok = await deleteCheckpoint(req.params.id!, req.session.userId!);
    if (!ok) {
      res.status(404).json({ error: "not found or not a checkpoint" });
      return;
    }
    res.status(204).end();
  }
);
