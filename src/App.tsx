import { useEffect, useState, type ReactNode } from "react";
import { ApiError, onAuthError, post } from "./api";
import { useApi } from "./hooks";
import { initialRouteFromLaunch, match, navigate, useRoute } from "./router";
import { closeApp, setBackButton, startParam, tg } from "./telegram";
import type { Me } from "./types";
import { TabBar, TABS } from "./components/TabBar";
import { Empty, Spinner } from "./components/ui";
import { DealDetail } from "./screens/DealDetail";
import { DealForm } from "./screens/DealForm";
import { Deals } from "./screens/Deals";
import { Home } from "./screens/Home";
import { Profile, SettingsScreen, UsersScreen } from "./screens/Profile";
import { Search } from "./screens/Search";
import { Stats } from "./screens/Stats";
import { TaskDetail, Tasks } from "./screens/Tasks";

const TAB_ROOTS = new Set<string>(TABS.map((t) => t.path));

export function App() {
  const route = useRoute();
  const me = useApi<Me>("/me");
  const [fatal, setFatal] = useState<ApiError | null>(null);

  useEffect(() => onAuthError(setFatal), []);

  // Экран из ссылки бота (?r=deals/5) или t.me/...?startapp=deal_5 — один раз при запуске.
  useEffect(() => {
    const target = initialRouteFromLaunch(startParam());
    if (target && route === "/") navigate(target, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // На корневых вкладках системная «Назад» не нужна.
  useEffect(() => {
    if (TAB_ROOTS.has(route)) setBackButton(null);
  }, [route]);

  // Плавная прокрутка наверх при смене экрана.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);

  if (!tg?.initData) {
    return <FatalScreen emoji="📱" title="Откройте приложение из Telegram" text="Приложение работает внутри Telegram: кнопка «📱 Приложение» в меню бота." />;
  }
  if (fatal) return <FatalForError error={fatal} />;
  if (me.error && !me.data) return <FatalForError error={me.error} />;
  if (!me.data) return <Spinner label="Открываю…" />;

  const showTabs = !match(route, "/deals/new") && !match(route, "/deals/:id/edit");

  return (
    <div className={`app ${showTabs ? "with-tabs" : ""}`}>
      <main>{renderRoute(route, me.data)}</main>
      {showTabs && <TabBar route={route} />}
    </div>
  );
}

function renderRoute(route: string, me: Me) {
  let p: Record<string, string> | null;
  if (route === "/") return <Home me={me} />;
  if (match(route, "/deals")) return <Deals />;
  if (match(route, "/deals/new")) return <DealForm me={me} />;
  if ((p = match(route, "/deals/:id/edit"))) return <DealForm key={p.id} id={Number(p.id)} me={me} />;
  if ((p = match(route, "/deals/:id"))) return <DealDetail key={p.id} id={Number(p.id)} me={me} />;
  if (match(route, "/tasks")) return <Tasks />;
  if ((p = match(route, "/tasks/:id"))) return <TaskDetail key={p.id} id={Number(p.id)} />;
  if (match(route, "/stats")) return <Stats />;
  if (match(route, "/search")) return <Search />;
  if (match(route, "/profile")) return <Profile me={me} />;
  if (match(route, "/profile/settings")) return <SettingsScreen />;
  if (match(route, "/profile/users")) return <UsersScreen />;
  return <Empty emoji="🧭" text="Экран не найден" action={<button className="btn" onClick={() => navigate("/")}>На главную</button>} />;
}

function FatalForError({ error }: { error: ApiError }) {
  if (error.code === "forbidden") {
    return (
      <FatalScreen
        emoji="⛔"
        title="Нет доступа"
        text={`Попросите владельца бота добавить вас. Ваш Telegram ID: ${tg?.initDataUnsafe?.user?.id ?? "—"}`}
      />
    );
  }
  if (error.code === "openai_login_required") {
    return (
      <FatalScreen
        emoji="🔐"
        title="Нужно войти через OpenAI"
        text="Ассистент работает через подписку ChatGPT. Войдите в чате с ботом — я пришлю кнопку."
        action={
          <button className="btn big" onClick={async () => { await post("/open-in-chat", { screen: "openai" }).catch(() => undefined); closeApp(); }}>
            Войти в чате
          </button>
        }
      />
    );
  }
  if (error.code === "no_api") {
    return <FatalScreen emoji="🔌" title="Сервер не настроен" text="В сборке не задан адрес сервера бота (переменная VITE_API_BASE в настройках репозитория)." />;
  }
  if (error.code === "network") {
    return <FatalScreen emoji="📡" title="Сервер недоступен" text="Не удалось связаться с сервером бота. Проверьте интернет и попробуйте ещё раз." action={<button className="btn" onClick={() => window.location.reload()}>Обновить</button>} />;
  }
  if (error.code === "expired") {
    return <FatalScreen emoji="⏳" title="Сессия устарела" text="Закройте и откройте приложение заново." />;
  }
  return <FatalScreen emoji="⚠️" title="Не удалось открыть" text={error.message} action={<button className="btn" onClick={() => window.location.reload()}>Обновить</button>} />;
}

function FatalScreen({ emoji, title, text, action }: { emoji: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="fatal">
      <div className="fatal-emoji">{emoji}</div>
      <h1>{title}</h1>
      <p className="hint">{text}</p>
      {action}
    </div>
  );
}
