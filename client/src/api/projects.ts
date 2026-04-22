import { apiFetch } from "./client";
import type { TagRef } from "./boards";

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  tags?: TagRef[];
}

export const projectsApi = {
  list: (): Promise<Project[]> => apiFetch<Project[]>("/api/projects"),
  get: (id: string): Promise<Project> =>
    apiFetch<Project>(`/api/projects/${id}`),
  create: (name: string): Promise<Project> =>
    apiFetch<Project>("/api/projects", { method: "POST", body: { name } }),
  rename: (id: string, name: string): Promise<Project> =>
    apiFetch<Project>(`/api/projects/${id}`, {
      method: "PATCH",
      body: { name },
    }),
  remove: (id: string): Promise<void> =>
    apiFetch<void>(`/api/projects/${id}`, { method: "DELETE" }),
  reorder: (ids: string[]): Promise<void> =>
    apiFetch<void>("/api/projects/reorder", { method: "POST", body: { ids } }),
};
