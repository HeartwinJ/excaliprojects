import { Router } from "express";
import { z } from "zod";
import {
  createBoard,
  duplicateBoard,
  findBoardById,
  listRecentBoards,
  moveBoard,
  renameBoard,
  saveBoardScene,
  setBoardFavourite,
  softDeleteBoard,
} from "../../repos/boards.js";
import { maybeAutoSnapshot } from "../../repos/versions.js";
import { doubleCsrfProtection } from "../csrf.js";
import { requireAuth } from "./auth.js";

export const boardsRouter = Router();

const nameSchema = z.string().trim().min(1).max(200);

boardsRouter.get("/api/boards/recent", requireAuth, async (req, res) => {
  const boards = await listRecentBoards(req.session.userId!);
  res.json(boards);
});

boardsRouter.post("/api/projects/:projectId/boards", requireAuth, doubleCsrfProtection, async (req, res) => {
  const parsed = z.object({ name: nameSchema.default("Untitled") }).safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "invalid name" });
    return;
  }
  const board = await createBoard(req.params.projectId!, req.session.userId!, parsed.data.name);
  if (!board) {
    res.status(404).json({ error: "project not found" });
    return;
  }
  res.status(201).json(board);
});

boardsRouter.get("/api/boards/:id", requireAuth, async (req, res) => {
  const board = await findBoardById(req.params.id!, req.session.userId!);
  if (!board) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(board);
});

const patchSchema = z
  .object({
    name: nameSchema.optional(),
    isFavorite: z.boolean().optional(),
    projectId: z.string().uuid().optional(),
  })
  .refine((v) => v.name !== undefined || v.isFavorite !== undefined || v.projectId !== undefined, {
    message: "no fields to update",
  });

boardsRouter.patch("/api/boards/:id", requireAuth, doubleCsrfProtection, async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid payload" });
    return;
  }

  const userId = req.session.userId!;
  const boardId = req.params.id!;
  const existing = await findBoardById(boardId, userId);
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const { scene_json: _s, ...initial } = existing;
  void _s;
  let summary: typeof initial = initial;

  if (parsed.data.name !== undefined) {
    summary = (await renameBoard(boardId, userId, parsed.data.name)) ?? summary;
  }
  if (parsed.data.isFavorite !== undefined) {
    summary = (await setBoardFavourite(boardId, userId, parsed.data.isFavorite)) ?? summary;
  }
  if (parsed.data.projectId !== undefined) {
    const moved = await moveBoard(boardId, userId, parsed.data.projectId);
    if (!moved) {
      res.status(400).json({ error: "move failed" });
      return;
    }
    summary = moved;
  }

  res.json(summary);
});

boardsRouter.post("/api/boards/:id/duplicate", requireAuth, doubleCsrfProtection, async (req, res) => {
  const copy = await duplicateBoard(req.params.id!, req.session.userId!);
  if (!copy) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.status(201).json(copy);
});

boardsRouter.delete("/api/boards/:id", requireAuth, doubleCsrfProtection, async (req, res) => {
  const ok = await softDeleteBoard(req.params.id!, req.session.userId!);
  if (!ok) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.status(204).end();
});

boardsRouter.put("/api/boards/:id/scene", requireAuth, doubleCsrfProtection, async (req, res) => {
  const scene = req.body;
  if (scene === null || typeof scene !== "object") {
    res.status(400).json({ error: "scene must be an object" });
    return;
  }
  const updated = await saveBoardScene(req.params.id!, req.session.userId!, scene);
  if (!updated) {
    res.status(404).json({ error: "not found" });
    return;
  }
  void maybeAutoSnapshot(updated.id, scene, updated.save_count).catch(() => undefined);
  res.status(200).json({ updatedAt: updated.updated_at });
});
