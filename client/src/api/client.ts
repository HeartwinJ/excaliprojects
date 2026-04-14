export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

let cachedCsrfToken: string | null = null;

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch("/api/csrf", { credentials: "include" });
  if (!res.ok) throw new ApiError("failed to fetch csrf token", res.status, null);
  const data = (await res.json()) as { csrfToken: string };
  cachedCsrfToken = data.csrfToken;
  return data.csrfToken;
}

async function ensureCsrfToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedCsrfToken) return cachedCsrfToken;
  return fetchCsrfToken();
}

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipCsrf?: boolean;
}

export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";

  const headers = new Headers(options.headers);
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  if (mutating && !options.skipCsrf) {
    const token = await ensureCsrfToken();
    headers.set("x-csrf-token", token);
  }

  const doFetch = async (): Promise<Response> =>
    fetch(path, {
      ...options,
      method,
      credentials: "include",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

  let res = await doFetch();

  if (res.status === 403 && mutating && !options.skipCsrf) {
    const token = await ensureCsrfToken(true);
    headers.set("x-csrf-token", token);
    res = await doFetch();
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;

  if (!res.ok) {
    const msg =
      (data as { error?: string } | undefined)?.error ?? `request failed: ${res.status}`;
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}

export function resetCsrfCache(): void {
  cachedCsrfToken = null;
}
