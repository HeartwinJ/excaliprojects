import { apiFetch } from "./client";

export interface LibrarySummary {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface LibraryFile {
  name: string;
  data: Record<string, unknown>;
}

export const librariesApi = {
  list: (): Promise<LibrarySummary[]> => apiFetch<LibrarySummary[]>("/api/libraries"),
  items: (): Promise<unknown[]> => apiFetch<unknown[]>("/api/libraries/items"),
  upload: (payload: LibraryFile): Promise<LibrarySummary> =>
    apiFetch<LibrarySummary>("/api/libraries", { method: "POST", body: payload }),
  remove: (id: string): Promise<void> =>
    apiFetch<void>(`/api/libraries/${id}`, { method: "DELETE" }),
};
