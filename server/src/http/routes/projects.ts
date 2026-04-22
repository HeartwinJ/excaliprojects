import { Router } from "express";
import { z } from "zod";
import {
  createProject,
  findProjectById,
  listProjects,
  renameProject,
  reorderProjects,
  softDeleteProject,
  type ProjectRecord,
} from "../../repos/projects.js";
import { listBoardsInProject } from "../../repos/boards.js";
import { listTagsForProjects } from "../../repos/tags.js";
import { withBoardTags } from "./boards.js";
import { doubleCsrfProtection } from "../csrf.js";
import { requireAuth } from "./auth.js";

export const projectsRouter = Router();

const nameSchema = z.string().trim().min(1).max(200);

async function withProjectTags(
  projects: ProjectRecord[],
  ownerId: string
): Promise<Array<ProjectRecord & { tags: { id: string; name: string }[] }>> {
  const map = await listTagsForProjects(
    projects.map((p) => p.id),
    ownerId
  );
  return projects.map((p) => ({ ...p, tags: map.get(p.id) ?? [] }));
}

projectsRouter.get("/api/projects", requireAuth, async (req, res) => {
  const projects = await listProjects(req.session.userId!);
  res.json(await withProjectTags(projects, req.session.userId!));
});

projectsRouter.post(
  "/api/projects",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    const parsed = z.object({ name: nameSchema }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid name" });
      return;
    }
    const project = await createProject(req.session.userId!, parsed.data.name);
    res.status(201).json({ ...project, tags: [] });
  }
);

projectsRouter.patch(
  "/api/projects/:id",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    const parsed = z.object({ name: nameSchema }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid name" });
      return;
    }
    const updated = await renameProject(
      req.params.id!,
      req.session.userId!,
      parsed.data.name
    );
    if (!updated) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const [enriched] = await withProjectTags([updated], req.session.userId!);
    res.json(enriched);
  }
);

projectsRouter.post(
  "/api/projects/reorder",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    const parsed = z
      .object({ ids: z.array(z.string().uuid()).min(1) })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid payload" });
      return;
    }
    await reorderProjects(req.session.userId!, parsed.data.ids);
    res.status(204).end();
  }
);

projectsRouter.delete(
  "/api/projects/:id",
  requireAuth,
  doubleCsrfProtection,
  async (req, res) => {
    const ok = await softDeleteProject(req.params.id!, req.session.userId!);
    if (!ok) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.status(204).end();
  }
);

projectsRouter.get("/api/projects/:id", requireAuth, async (req, res) => {
  const project = await findProjectById(req.params.id!, req.session.userId!);
  if (!project) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const [enriched] = await withProjectTags([project], req.session.userId!);
  res.json(enriched);
});

projectsRouter.get(
  "/api/projects/:id/boards",
  requireAuth,
  async (req, res) => {
    const project = await findProjectById(
      req.params.id!,
      req.session.userId!
    );
    if (!project) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const boards = await listBoardsInProject(project.id, req.session.userId!);
    res.json(await withBoardTags(boards, req.session.userId!));
  }
);
