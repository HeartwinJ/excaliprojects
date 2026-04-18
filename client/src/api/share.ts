import { apiFetch } from "./client";

export interface ShareLink {
  id: string;
  token: string;
  url: string;
  expires_at: string | null;
  created_at: string;
}

export interface PublicBoard {
  name: string;
  scene_json: unknown;
  updated_at: string;
}

export const shareApi = {
  get: (boardId: string): Promise<ShareLink | null> =>
    apiFetch<ShareLink>(`/api/boards/${boardId}/share`).catch(() => null),
  create: (boardId: string, expiresInDays?: number): Promise<ShareLink> =>
    apiFetch<ShareLink>(`/api/boards/${boardId}/share`, {
      method: "POST",
      body: expiresInDays ? { expiresInDays } : {},
    }),
  revoke: (boardId: string): Promise<void> =>
    apiFetch<void>(`/api/boards/${boardId}/share`, { method: "DELETE" }),
  getPublic: (token: string): Promise<PublicBoard> =>
    apiFetch<PublicBoard>(`/api/share/${token}`, { skipCsrf: true }),
};
