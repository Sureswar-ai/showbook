import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export class ApiError extends Error {
  readonly statusCode: number;
  readonly details: unknown;
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

type AuthTokens = { accessToken: string | null; refreshToken: string | null };

const memory: AuthTokens = { accessToken: null, refreshToken: null };

export const authStorage = {
  getAccess(): string | null {
    if (typeof window === "undefined") return null;
    return memory.accessToken ?? localStorage.getItem("sb_access") ?? null;
  },
  getRefresh(): string | null {
    if (typeof window === "undefined") return null;
    return Cookies.get("sb_refresh") ?? null;
  },
  set(access: string, refresh: string) {
    memory.accessToken = access;
    memory.refreshToken = refresh;
    if (typeof window !== "undefined") {
      localStorage.setItem("sb_access", access);
      Cookies.set("sb_refresh", refresh, { expires: 30, sameSite: "strict" });
    }
  },
  clear() {
    memory.accessToken = null;
    memory.refreshToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("sb_access");
      Cookies.remove("sb_refresh");
    }
  },
};

async function refreshIfNeeded(): Promise<boolean> {
  const rt = authStorage.getRefresh();
  if (!rt) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    authStorage.set(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  options: { retryOn401?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = authStorage.getAccess();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (res.status === 401 && options.retryOn401 !== false) {
    const ok = await refreshIfNeeded();
    if (ok) return request<T>(method, path, body, { retryOn401: false });
    authStorage.clear();
  }
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const msg =
      (isJson && (payload as { message?: string }).message) ||
      (typeof payload === "string" ? payload : "Request failed");
    throw new ApiError(msg, res.status, payload);
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
};

export { API_URL };
