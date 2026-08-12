export const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export function apiUrl(path: string): string {
  return `${backendUrl}/api${path.startsWith("/") ? path : `/${path}`}`;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  formData?: FormData;
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
  let code = "UNKNOWN";
  let message = "Something went wrong. Please try again.";
  let details: unknown;
  try {
    const data = await res.json();
    if (data?.error?.message) message = data.error.message;
    if (data?.error?.code) code = data.error.code;
    if (data?.error?.details !== undefined) details = data.error.details;
  } catch {
    message = `Request failed (${res.status}).`;
  }
  throw new ApiClientError(res.status, code, message, details);
}

/** Typed JSON API client. Sends cookies for Better Auth sessions. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { formData, ...rest } = options;
  const headers: Record<string, string> = { ...rest.headers };
  let body: BodyInit | undefined;
  if (formData) {
    body = formData;
  } else if (rest.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(rest.body);
  }
  const res = await fetch(apiUrl(path), {
    method: rest.method ?? "GET",
    headers,
    body,
    signal: rest.signal,
    credentials: "include",
  });
  return handle<T>(res);
}

export const get = <T>(path: string, options?: RequestOptions) => api<T>(path, { ...options, method: "GET" });
export const post = <T>(path: string, body?: unknown, options?: RequestOptions) => api<T>(path, { ...options, method: "POST", body });
export const patch = <T>(path: string, body?: unknown, options?: RequestOptions) => api<T>(path, { ...options, method: "PATCH", body });
export const del = <T>(path: string, options?: RequestOptions) => api<T>(path, { ...options, method: "DELETE" });
