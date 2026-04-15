import { apiFetch } from "./client";

export interface BoardSummary {
  id: string;
  project_id: string;
  name: string;
  thumbnail_path: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Board extends BoardSummary {
  scene_json: unknown;
}

export const boardsApi = {
  listForProject: (projectId: string): Promise<BoardSummary[]> =>
    apiFetch<BoardSummary[]>(`/api/projects/${projectId}/boards`),
  recent: (): Promise<BoardSummary[]> => apiFetch<BoardSummary[]>("/api/boards/recent"),
  get: (id: string): Promise<Board> => apiFetch<Board>(`/api/boards/${id}`),
  create: (projectId: string, name?: string): Promise<BoardSummary> =>
    apiFetch<BoardSummary>(`/api/projects/${projectId}/boards`, {
      method: "POST",
      body: name ? { name } : {},
    }),
  update: (
    id: string,
    patch: { name?: string; isFavorite?: boolean; projectId?: string }
  ): Promise<BoardSummary> =>
    apiFetch<BoardSummary>(`/api/boards/${id}`, { method: "PATCH", body: patch }),
  duplicate: (id: string): Promise<BoardSummary> =>
    apiFetch<BoardSummary>(`/api/boards/${id}/duplicate`, { method: "POST" }),
  remove: (id: string): Promise<void> =>
    apiFetch<void>(`/api/boards/${id}`, { method: "DELETE" }),
  saveScene: (id: string, scene: unknown): Promise<{ updatedAt: string }> =>
    apiFetch<{ updatedAt: string }>(`/api/boards/${id}/scene`, { method: "PUT", body: scene }),
  uploadThumbnail: async (id: string, png: Blob): Promise<{ thumbnail_path: string }> => {
    const csrfRes = await fetch("/api/csrf", { credentials: "include" });
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
    const res = await fetch(`/api/boards/${id}/thumbnail`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "content-type": "image/png",
        "x-csrf-token": csrfToken,
      },
      body: png,
    });
    if (!res.ok) throw new Error(`thumbnail upload failed: ${res.status}`);
    return (await res.json()) as { thumbnail_path: string };
  },
};
