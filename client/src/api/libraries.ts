import { apiFetch } from "./client";

export interface LibrarySummary {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface LibraryItem {
  id: string;
  status: "published" | "unpublished";
  created: number;
  name?: string;
  elements: unknown[];
}

export interface LibraryFile {
  name: string;
  data: Record<string, unknown>;
}

export const librariesApi = {
  list: (): Promise<LibrarySummary[]> =>
    apiFetch<LibrarySummary[]>("/api/libraries"),
  /** Merged stream of every library's items — used by the editor panel. */
  items: (): Promise<unknown[]> => apiFetch<unknown[]>("/api/libraries/items"),
  /** Items in a single library — used by the Libraries management page. */
  itemsFor: (id: string): Promise<LibraryItem[]> =>
    apiFetch<LibraryItem[]>(`/api/libraries/${id}/items`),
  upload: (payload: LibraryFile): Promise<LibrarySummary> =>
    apiFetch<LibrarySummary>("/api/libraries", {
      method: "POST",
      body: payload,
    }),
  remove: (id: string): Promise<void> =>
    apiFetch<void>(`/api/libraries/${id}`, { method: "DELETE" }),
};
