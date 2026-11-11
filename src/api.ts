import { initData } from "./telegram";

/**
 * Адрес сервера бота (задаётся при сборке: VITE_API_BASE). Пусто в dev-режиме —
 * запросы идут на тот же адрес и проксируются Vite на локальный бот.
 */
export const API_BASE: string = String(import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

/** Ошибка API с кодом (unauthorized, forbidden, openai_login_required, …). */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

type Listener = (error: ApiError) => void;
const authListeners = new Set<Listener>();

/** Подписка на «фатальные» ошибки (нет доступа, нужен вход) — их показывает App. */
export function onAuthError(listener: Listener): () => void {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

const FATAL = new Set(["unauthorized", "expired", "forbidden", "openai_login_required", "no_api"]);

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!API_BASE && import.meta.env.PROD) {
    const error = new ApiError("Не задан адрес сервера бота (VITE_API_BASE).", 0, "no_api");
    authListeners.forEach((l) => l(error));
    throw error;
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/app${path}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `tma ${initData()}`,
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Нет соединения с сервером.", 0, "network");
  }
  let payload: { ok?: boolean; error?: string; code?: string } & Record<string, unknown> = {};
  try {
    payload = await response.json();
  } catch {
    /* не JSON */
  }
  if (!response.ok || payload.ok === false) {
    const error = new ApiError(
      payload.error || `Ошибка ${response.status}`,
      response.status,
      payload.code || "error",
    );
    if (FATAL.has(error.code)) authListeners.forEach((l) => l(error));
    throw error;
  }
  return payload as T;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, body: unknown = {}) => api<T>(path, { method: "POST", body });
export const patch = <T>(path: string, body: unknown) => api<T>(path, { method: "PATCH", body });
export const del = <T>(path: string) => api<T>(path, { method: "DELETE" });
