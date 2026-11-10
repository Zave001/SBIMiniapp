import { haptic } from "../telegram";
import { navigate } from "../router";
import { IconCalendar, IconChart, IconCheck, IconHome, IconUser } from "./Icons";

export const TABS = [
  { path: "/", label: "Главная", Icon: IconHome },
  { path: "/deals", label: "Дела", Icon: IconCalendar },
  { path: "/tasks", label: "Задачи", Icon: IconCheck },
  { path: "/stats", label: "Статистика", Icon: IconChart },
  { path: "/profile", label: "Профиль", Icon: IconUser },
] as const;

/** Активная вкладка по первому сегменту маршрута. */
export function activeTab(route: string): string {
  const first = `/${route.split("/").filter(Boolean)[0] ?? ""}`;
  return TABS.some((t) => t.path === first) ? first : "/";
}

export function TabBar({ route }: { route: string }) {
  const active = activeTab(route);
  return (
    <nav className="tabbar">
      {TABS.map(({ path, label, Icon }) => (
        <button
          key={path}
          className={path === active ? "active" : ""}
          onClick={() => {
            if (path !== active || route !== path) {
              haptic.select();
              navigate(path);
            }
          }}
        >
          <Icon size={23} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
