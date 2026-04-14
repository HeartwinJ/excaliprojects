import { Router } from "express";
import { z } from "zod";
import {
  createProject,
  findProjectById,
  listProjects,
  renameProject,
  reorderProjects,
  softDeleteProject,
} from "../../repos/projects.js";
import { listBoardsInProject } from "../../repos/boards.js";
import { doubleCsrfProtection } from "../csrf.js";
import { requireAuth } from "./auth.js";

export const projectsRouter = Router();

const nameSchema = z.string().trim().min(1).max(200);

projectsRouter.use(requireAuth);

projectsRouter.get("/api/projects", async (req, res) => {
  const projects = await listProjects(req.session.userId!);
  res.json(projects);
});

projectsRouter.post("/api/projects", doubleCsrfProtection, async (req, res) => {
  const parsed = z.object({ name: nameSchema }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid name" });
    return;
  }
  const project = await createProject(req.session.userId!, parsed.data.name);
  res.status(201).json(project);
});

projectsRouter.patch("/api/projects/:id", doubleCsrfProtection, async (req, res) => {
  const parsed = z.object({ name: nameSchema }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid name" });
    return;
  }
  const updated = await renameProject(req.params.id!, req.session.userId!, parsed.data.name);
  if (!updated) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(updated);
});

projectsRouter.post("/api/projects/reorder", doubleCsrfProtection, async (req, res) => {
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid payload" });
    return;
  }
  await reorderProjects(req.session.userId!, parsed.data.ids);
  res.status(204).end();
});

projectsRouter.delete("/api/projects/:id", doubleCsrfProtection, async (req, res) => {
  const ok = await softDeleteProject(req.params.id!, req.session.userId!);
  if (!ok) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.status(204).end();
});

projectsRouter.get("/api/projects/:id", async (req, res) => {
  const project = await findProjectById(req.params.id!, req.session.userId!);
  if (!project) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(project);
});

projectsRouter.get("/api/projects/:id/boards", async (req, res) => {
  const project = await findProjectById(req.params.id!, req.session.userId!);
  if (!project) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const boards = await listBoardsInProject(project.id, req.session.userId!);
  res.json(boards);
});
