import { useEffect, useState } from "react";

/** Маршрут из hash: «#/deals/5» → "/deals/5". */
export function currentRoute(): string {
  const hash = window.location.hash.replace(/^#/, "");
  return hash.startsWith("/") ? hash : "/";
}

export function navigate(path: string, replace = false): void {
  const target = `#${path}`;
  if (replace) window.history.replaceState(null, "", target);
  else window.location.hash = path;
  if (replace) window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function goBack(fallback = "/"): void {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback, true);
}

export function useRoute(): string {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

/** Сопоставить маршрут с шаблоном «/deals/:id». */
export function match(route: string, pattern: string): Record<string, string> | null {
  const a = route.split("?")[0].split("/").filter(Boolean);
  const b = pattern.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < b.length; i += 1) {
    if (b[i].startsWith(":")) params[b[i].slice(1)] = decodeURIComponent(a[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

/** Экран из ссылки бота (?r=deals/5) или start_param (deal_5, task_7). */
export function initialRouteFromLaunch(startParam?: string): string | null {
  const r = new URLSearchParams(window.location.search).get("r");
  if (r) return `/${r.replace(/^\/+/, "")}`;
  const m = startParam?.match(/^(deal|task)_(\d+)$/);
  if (m) return `/${m[1]}s/${m[2]}`;
  return null;
}
