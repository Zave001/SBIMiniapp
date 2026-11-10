import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, get } from "./api";
import { setBackButton } from "./telegram";
import { goBack } from "./router";

export interface Loaded<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (value: T | ((prev: T | null) => T | null)) => void;
}

/** Загрузить данные по пути API; перезагружает при смене пути и при возврате в приложение. */
export function useApi<T>(path: string | null): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const current = useRef(path);
  current.current = path;

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      const value = await get<T>(path);
      if (current.current === path) {
        setData(value);
        setError(null);
      }
    } catch (e) {
      if (current.current === path) setError(e as ApiError);
    } finally {
      if (current.current === path) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Изменения, сделанные в чате с ассистентом, видны при возврате в приложение.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  return { data, error, loading, reload, setData };
}

/** Показать системную кнопку «Назад» на экране. */
export function useBackButton(enabled = true, fallback = "/"): void {
  useEffect(() => {
    if (!enabled) return setBackButton(null);
    return setBackButton(() => goBack(fallback));
  }, [enabled, fallback]);
}

/** Отложенное значение (для поиска при наборе). */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
