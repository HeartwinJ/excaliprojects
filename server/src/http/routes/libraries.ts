import { Router } from "express";
import { z } from "zod";
import {
  createLibrary,
  deleteLibrary,
  getLibrary,
  getMergedLibraryItems,
  listLibraries,
} from "../../repos/libraries.js";
import { doubleCsrfProtection } from "../csrf.js";
import { requireAuth } from "./auth.js";

export const librariesRouter = Router();

librariesRouter.get("/api/libraries", requireAuth, async (req, res) => {
  const libs = await listLibraries(req.session.userId!);
  res.json(libs);
});

librariesRouter.get("/api/libraries/items", requireAuth, async (req, res) => {
  const items = await getMergedLibraryItems(req.session.userId!);
  res.json(items);
});

librariesRouter.get("/api/libraries/:id", requireAuth, async (req, res) => {
  const lib = await getLibrary(req.params.id!, req.session.userId!);
  if (!lib) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(lib);
});

const uploadSchema = z.object({
  name: z.string().trim().min(1).max(150),
  data: z.object({}).passthrough(),
});

librariesRouter.post(
  "/api/libraries",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    const parsed = uploadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid library payload" });
      return;
    }
    const lib = await createLibrary(
      req.session.userId!,
      parsed.data.name,
      parsed.data.data
    );
    res.status(201).json(lib);
  }
);

librariesRouter.delete(
  "/api/libraries/:id",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    const ok = await deleteLibrary(req.params.id!, req.session.userId!);
    if (!ok) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.status(204).end();
  }
);
