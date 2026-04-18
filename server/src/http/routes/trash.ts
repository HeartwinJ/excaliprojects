import { Router } from "express";
import {
  listTrash,
  permanentDeleteBoard,
  permanentDeleteProject,
  restoreBoard,
  restoreProject,
} from "../../repos/trash.js";
import { doubleCsrfProtection } from "../csrf.js";
import { requireAuth } from "./auth.js";

export const trashRouter = Router();

trashRouter.get("/api/trash", requireAuth, async (req, res) => {
  const items = await listTrash(req.session.userId!);
  res.json(items);
});

trashRouter.post(
  "/api/trash/:kind/:id/restore",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    const { kind, id } = req.params;
    const userId = req.session.userId!;
    const ok =
      kind === "project"
        ? await restoreProject(id!, userId)
        : kind === "board"
          ? await restoreBoard(id!, userId)
          : false;
    if (!ok) {
      res.status(404).json({ error: "not found or parent project is deleted" });
      return;
    }
    res.status(204).end();
  }
);

trashRouter.delete(
  "/api/trash/:kind/:id",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    const { kind, id } = req.params;
    const userId = req.session.userId!;
    const ok =
      kind === "project"
        ? await permanentDeleteProject(id!, userId)
        : kind === "board"
          ? await permanentDeleteBoard(id!, userId)
          : false;
    if (!ok) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.status(204).end();
  }
);
