import { apiFetch } from "./client";

export const backupApi = {
  downloadUrl: "/api/export-all",
  restore: (data: unknown): Promise<{ ok: boolean; created: { projects: number; boards: number; libraries: number } }> =>
    apiFetch("/api/restore", { method: "POST", body: data }),
};
