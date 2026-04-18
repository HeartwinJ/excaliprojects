import { apiFetch } from "./client";

export type TrashItem =
  | { kind: "project"; id: string; name: string; deleted_at: string }
  | {
      kind: "board";
      id: string;
      name: string;
      project_id: string;
      project_name: string;
      project_deleted_at: string | null;
      deleted_at: string;
    };

export const trashApi = {
  list: (): Promise<TrashItem[]> => apiFetch<TrashItem[]>("/api/trash"),
  restore: (kind: "project" | "board", id: string): Promise<void> =>
    apiFetch<void>(`/api/trash/${kind}/${id}/restore`, { method: "POST" }),
  remove: (kind: "project" | "board", id: string): Promise<void> =>
    apiFetch<void>(`/api/trash/${kind}/${id}`, { method: "DELETE" }),
};
