import { Router } from "express";
import { z } from "zod";
import {
  listTagsForBoard,
  listTagsForOwner,
  setBoardTags,
} from "../../repos/tags.js";
import { search } from "../../repos/search.js";
import { doubleCsrfProtection } from "../csrf.js";
import { requireAuth } from "./auth.js";

export const tagsRouter = Router();

tagsRouter.get("/api/tags", requireAuth, async (req, res) => {
  const tags = await listTagsForOwner(req.session.userId!);
  res.json(tags);
});

tagsRouter.get("/api/boards/:id/tags", requireAuth, async (req, res) => {
  const tags = await listTagsForBoard(req.params.id!, req.session.userId!);
  res.json(tags);
});

const tagsBodySchema = z.object({
  tags: z.array(z.string().trim().min(1).max(50)).max(50),
});

tagsRouter.put(
  "/api/boards/:id/tags",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    const parsed = tagsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid tags payload" });
      return;
    }
    try {
      const tags = await setBoardTags(
        req.params.id!,
        req.session.userId!,
        parsed.data.tags
      );
      res.json(tags);
    } catch {
      res.status(404).json({ error: "board not found" });
    }
  }
);

tagsRouter.get("/api/search", requireAuth, async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 1) {
    res.json([]);
    return;
  }
  const hits = await search(req.session.userId!, q);
  res.json(hits);
});
