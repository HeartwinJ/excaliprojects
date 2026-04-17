import { apiFetch } from "./client";

export interface Tag {
  id: string;
  name: string;
}

export type SearchHit =
  | { kind: "project"; id: string; name: string }
  | {
      kind: "board";
      id: string;
      name: string;
      project_id: string;
      project_name: string;
      thumbnail_path: string | null;
      tags: string[];
      updated_at: string;
    };

export const tagsApi = {
  list: (): Promise<Tag[]> => apiFetch<Tag[]>("/api/tags"),
  listForBoard: (boardId: string): Promise<Tag[]> =>
    apiFetch<Tag[]>(`/api/boards/${boardId}/tags`),
  setForBoard: (boardId: string, tags: string[]): Promise<Tag[]> =>
    apiFetch<Tag[]>(`/api/boards/${boardId}/tags`, { method: "PUT", body: { tags } }),
  search: (q: string): Promise<SearchHit[]> =>
    apiFetch<SearchHit[]>(`/api/search?q=${encodeURIComponent(q)}`),
};
