import { apiFetch } from "./client";

export interface VersionSummary {
  id: string;
  board_id: string;
  label: string | null;
  is_checkpoint: boolean;
  created_at: string;
}

export const versionsApi = {
  list: (boardId: string): Promise<VersionSummary[]> =>
    apiFetch<VersionSummary[]>(`/api/boards/${boardId}/versions`),
  checkpoint: (boardId: string, label?: string): Promise<VersionSummary> =>
    apiFetch<VersionSummary>(`/api/boards/${boardId}/versions`, {
      method: "POST",
      body: label ? { label } : {},
    }),
  restore: (versionId: string): Promise<void> =>
    apiFetch<void>(`/api/versions/${versionId}/restore`, { method: "POST" }),
  remove: (versionId: string): Promise<void> =>
    apiFetch<void>(`/api/versions/${versionId}`, { method: "DELETE" }),
};
