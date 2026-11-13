import { useMemo, useState } from "react";
import { useApi, useDebounced } from "../hooks";
import { navigate } from "../router";
import { todayIn } from "../format";
import type { Deal, Me } from "../types";
import { IconPlus, IconSearch } from "../components/Icons";
import { DealRow, Empty, ErrorBox, Screen, Segmented, Spinner } from "../components/ui";

type PeriodFilter = "upcoming" | "past" | "all";
type View = "list" | "week";

const PERIODS: { value: PeriodFilter; label: string }[] = [
  { value: "upcoming", label: "Предстоящие" },
  { value: "past", label: "Прошедшие" },
  { value: "all", label: "Все" },
];

export function Deals({ me }: { me: Me }) {
  const [period, setPeriod] = useState<PeriodFilter>("upcoming");
  const [view, setView] = useState<View>("list");
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim());
  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (view === "list" && period !== "all") params.set("period", period);
    if (q) params.set("q", q);
    return `/deals?${params.toString()}`;
  }, [period, q, view]);
  const { data, error, loading, reload } = useApi<{ events: Deal[] }>(path);
  const events = data?.events ?? [];

  return (
    <Screen
      title="Дела"
      action={
        <button className="icon-btn accent" aria-label="Новое дело" onClick={() => navigate("/deals/new")}>
          <IconPlus />
        </button>
      }
    >
      <div className="search-field">
        <IconSearch size={18} />
        <input placeholder="Название, участники, место…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="toolbar">
        <Segmented value={view} options={[{ value: "list", label: "Список" }, { value: "week", label: "Неделя" }]} onChange={setView} />
      </div>
      {view === "list" && <Segmented value={period} options={PERIODS} onChange={setPeriod} />}

      {loading && !data && <Spinner />}
      {error && <ErrorBox message={error.message} onRetry={reload} />}
      {data && events.length === 0 && (
        <Empty
          emoji="🗓"
          text={q ? "Ничего не нашлось" : "Здесь пока пусто"}
          action={<button className="btn" onClick={() => navigate("/deals/new")}>Создать дело</button>}
        />
      )}
      {data && events.length > 0 && (view === "list" ? <DealList events={events} /> : <WeekView events={events} timezone={me.timezone} />)}
    </Screen>
  );
}

function DealList({ events }: { events: Deal[] }) {
  return (
    <div className="card list">
      {events.map((d) => (
        <DealRow key={d.id} deal={d} />
      ))}
    </div>
  );
}

const WEEKDAY_NAMES = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

/**
 * Неделя: 7 дней от понедельника. «Сегодня» — в поясе из настроек бота, а не
 * телефона: даты дел приходят в этом поясе, иначе дни разъедутся.
 */
function WeekView({ events, timezone }: { events: Deal[]; timezone: string }) {
  const [offset, setOffset] = useState(0);
  const todayIso = todayIn(timezone);
  const days = useMemo(() => {
    const [y, m, d] = todayIso.split("-").map(Number);
    const monday = new Date(Date.UTC(y, m - 1, d));
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7) + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [offset, todayIso]);
  const byDay = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const e of events) {
      if (!e.start) continue;
      (map[e.start.slice(0, 10)] ??= []).push(e);
    }
    Object.values(map).forEach((list) => list.sort((a, b) => (a.start ?? "").localeCompare(b.start ?? "")));
    return map;
  }, [events]);

  return (
    <div className="week">
      <div className="week-nav">
        <button className="btn ghost small" onClick={() => setOffset(offset - 1)}>← Неделя</button>
        <span className="hint">{days[0].slice(8, 10)}.{days[0].slice(5, 7)} — {days[6].slice(8, 10)}.{days[6].slice(5, 7)}</span>
        <button className="btn ghost small" onClick={() => setOffset(offset + 1)}>Неделя →</button>
      </div>
      {days.map((day, i) => (
        <div key={day} className={`week-day ${day === todayIso ? "today" : ""}`}>
          <div className="week-day-head">
            <b>{WEEKDAY_NAMES[i]}</b>
            <span className="hint small">{day.slice(8, 10)}.{day.slice(5, 7)}</span>
          </div>
          {(byDay[day] ?? []).length === 0 ? (
            <p className="hint small week-empty">—</p>
          ) : (
            <div className="card list">
              {(byDay[day] ?? []).map((d) => <DealRow key={d.id} deal={d} compact />)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
