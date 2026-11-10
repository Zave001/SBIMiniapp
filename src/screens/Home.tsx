import { useRef, useState, type ReactNode } from "react";
import { patch } from "../api";
import { fmtDate, fmtTime, greeting, percent, plural } from "../format";
import { useApi } from "../hooks";
import { navigate } from "../router";
import { closeApp, haptic } from "../telegram";
import type { Home as HomeData, Me, Task } from "../types";
import {
  IconBell,
  IconCalendar,
  IconChart,
  IconChat,
  IconCheck,
  IconGear,
  IconGoogle,
  IconPeople,
  IconPlus,
  IconSearch,
  IconSpark,
  IconStar,
} from "../components/Icons";
import { Card, DealRow, Empty, ErrorBox, Section, Spinner } from "../components/ui";

const SLIDES = ["Ближайшие", "Важное", "Задачи", "Напоминания", "Статистика"] as const;

export function Home({ me }: { me: Me }) {
  const { data, error, loading, reload, setData } = useApi<HomeData>("/home");
  const [slide, setSlide] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const toggleTask = async (task: Task) => {
    // Оптимистично убираем выполненную задачу из подборок, затем перезагружаем.
    setData((prev) =>
      prev && {
        ...prev,
        tasks_today: prev.tasks_today.filter((t) => t.id !== task.id),
        overdue: prev.overdue.filter((t) => t.id !== task.id),
        important: { ...prev.important, tasks: prev.important.tasks.filter((t) => t.id !== task.id) },
      },
    );
    try {
      await patch(`/tasks/${task.id}`, { done: !task.done });
      haptic.success();
    } finally {
      void reload();
    }
  };

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / (el.clientWidth * 0.86));
    if (index !== slide) setSlide(Math.max(0, Math.min(SLIDES.length - 1, index)));
  };
  const goSlide = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth * 0.86, behavior: "smooth" });
  };

  const name = me.user.first_name || "друг";
  const hour = Number(new Intl.DateTimeFormat("ru-RU", { hour: "numeric", hour12: false, timeZone: me.timezone }).format(new Date()));

  return (
    <div className="screen home">
      <header className="hero">
        <div>
          <p className="hero-hello">{greeting(hour)},</p>
          <h1>{name} 👋</h1>
        </div>
        <button className="icon-btn" aria-label="Поиск" onClick={() => navigate("/search")}>
          <IconSearch />
        </button>
      </header>

      {loading && !data && <Spinner />}
      {error && !data && <ErrorBox message={error.message} onRetry={reload} />}

      {data && (
        <>
          <div className="slider" ref={track} onScroll={onScroll}>
            <SlideUpcoming data={data} />
            <SlideImportant data={data} onToggle={toggleTask} />
            <SlideTasks data={data} onToggle={toggleTask} />
            <SlideReminders data={data} />
            <SlideStats data={data} />
          </div>
          <div className="dots">
            {SLIDES.map((label, i) => (
              <button key={label} className={i === slide ? "active" : ""} aria-label={label} onClick={() => goSlide(i)} />
            ))}
          </div>

          <div className="quick">
            <button className="quick-btn primary" onClick={() => navigate("/deals/new")}>
              <IconPlus /> Новое дело
            </button>
            <button className="quick-btn" onClick={closeApp}>
              <IconChat /> Ассистент
            </button>
          </div>

          {data.awaiting_outcome.length > 0 && (
            <Section title="📝 Ждут итогов">
              <Card className="accent-soft">
                <p className="hint small">Запишите, как прошли встречи, — итоги и поручения не потеряются.</p>
                {data.awaiting_outcome.map((d) => (
                  <DealRow key={d.id} deal={d} compact />
                ))}
              </Card>
            </Section>
          )}

          <Section title="Сегодня" action={<button className="link" onClick={() => navigate("/deals")}>Все дела</button>}>
            <Card>
              {data.today.length === 0 ? (
                <p className="hint">На сегодня дел нет.</p>
              ) : (
                data.today.map((d) => <DealRow key={d.id} deal={d} compact />)
              )}
            </Card>
          </Section>

          <Section title="Разделы">
            <div className="grid">
              <Shortcut icon={<IconCalendar />} label="Дела" onClick={() => navigate("/deals")} />
              <Shortcut icon={<IconCheck />} label="Задачи" onClick={() => navigate("/tasks")} badge={data.overdue.length || undefined} />
              <Shortcut icon={<IconChart />} label="Статистика" onClick={() => navigate("/stats")} />
              <Shortcut icon={<IconSearch />} label="Поиск" onClick={() => navigate("/search")} />
              <Shortcut icon={<IconGoogle />} label="Google" onClick={() => navigate("/profile")} dot={!me.google_connected} />
              <Shortcut icon={<IconSpark />} label="OpenAI" onClick={() => navigate("/profile")} />
              <Shortcut icon={<IconPeople />} label="Пользователи" onClick={() => navigate("/profile/users")} />
              <Shortcut icon={<IconGear />} label="Настройки" onClick={() => navigate("/profile/settings")} />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function Shortcut({ icon, label, onClick, badge, dot }: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
  dot?: boolean;
}) {
  return (
    <button className="shortcut" onClick={() => { haptic.tap(); onClick(); }}>
      <span className="shortcut-icon">
        {icon}
        {badge ? <i className="badge">{badge}</i> : dot ? <i className="badge dot" /> : null}
      </span>
      <span>{label}</span>
    </button>
  );
}

function Slide({ title, icon, tone, children, onMore }: {
  title: string;
  icon: ReactNode;
  tone: string;
  children: ReactNode;
  onMore?: () => void;
}) {
  return (
    <div className={`slide ${tone}`}>
      <div className="slide-head">
        <span className="slide-icon">{icon}</span>
        <h3>{title}</h3>
        {onMore && <button className="link light" onClick={onMore}>Все</button>}
      </div>
      <div className="slide-body">{children}</div>
    </div>
  );
}

function SlideUpcoming({ data }: { data: HomeData }) {
  const items = [...data.now, ...data.upcoming].slice(0, 4);
  return (
    <Slide title="Ближайшие дела" icon={<IconCalendar size={20} />} tone="tone-blue" onMore={() => navigate("/deals")}>
      {items.length === 0 ? (
        <Empty emoji="🗓" text="Предстоящих дел нет" />
      ) : (
        items.map((d) => (
          <button key={d.id} className="slide-item" onClick={() => navigate(`/deals/${d.id}`)}>
            <span className="slide-time">{d.period === "now" ? "сейчас" : fmtTime(d.start)}</span>
            <span className="slide-text">
              {d.important && "❗ "}
              {d.title}
              <small>{d.when}</small>
            </span>
          </button>
        ))
      )}
    </Slide>
  );
}

function SlideImportant({ data, onToggle }: { data: HomeData; onToggle: (t: Task) => void }) {
  const { deals, tasks } = data.important;
  return (
    <Slide title="Важное" icon={<IconStar size={20} filled />} tone="tone-red">
      {deals.length === 0 && tasks.length === 0 ? (
        <Empty emoji="✨" text="Ничего срочного. Отметьте ⭐ важное — или скажите боту «срочно»." />
      ) : (
        <>
          {deals.slice(0, 3).map((d) => (
            <button key={d.id} className="slide-item" onClick={() => navigate(`/deals/${d.id}`)}>
              <span className="slide-time">{fmtTime(d.start) || "—"}</span>
              <span className="slide-text">{d.title}<small>{d.when}</small></span>
            </button>
          ))}
          {tasks.slice(0, 3).map((t) => (
            <div key={t.id} className="slide-task">
              <button className="check light" onClick={() => onToggle(t)} aria-label="Выполнено" />
              <span className="slide-text" onClick={() => navigate(`/tasks/${t.id}`)}>
                {t.title}
                <small>«{t.event_title}»</small>
              </span>
            </div>
          ))}
        </>
      )}
    </Slide>
  );
}

function SlideTasks({ data, onToggle }: { data: HomeData; onToggle: (t: Task) => void }) {
  const items = [...data.overdue, ...data.tasks_today].slice(0, 4);
  return (
    <Slide title="Задачи" icon={<IconCheck size={20} />} tone="tone-green" onMore={() => navigate("/tasks")}>
      <div className="slide-counters">
        <span><b>{data.tasks_today.length}</b> на сегодня</span>
        <span className={data.overdue.length ? "warn" : ""}><b>{data.overdue.length}</b> просрочено</span>
      </div>
      {items.length === 0 ? (
        <Empty emoji="🎉" text="Срочных задач нет" />
      ) : (
        items.map((t) => (
          <div key={t.id} className="slide-task">
            <button className="check light" onClick={() => onToggle(t)} aria-label="Выполнено" />
            <span className="slide-text" onClick={() => navigate(`/tasks/${t.id}`)}>
              {t.title}
              <small className={t.overdue ? "warn" : ""}>{t.overdue ? "просрочено · " : ""}до {t.due_label}</small>
            </span>
          </div>
        ))
      )}
    </Slide>
  );
}

function SlideReminders({ data }: { data: HomeData }) {
  return (
    <Slide title="Напоминания" icon={<IconBell size={20} />} tone="tone-violet">
      {data.reminders.length === 0 ? (
        <Empty emoji="🔕" text="Напоминаний нет" />
      ) : (
        data.reminders.slice(0, 4).map((r) => (
          <button
            key={`${r.kind}-${r.task_id ?? r.event_id}-${r.at}`}
            className="slide-item"
            onClick={() => navigate(r.kind === "task" ? `/tasks/${r.task_id}` : `/deals/${r.event_id}`)}
          >
            <span className="slide-time">{fmtTime(r.at)}</span>
            <span className="slide-text">
              {r.title}
              <small>{fmtDate(r.at, false)} · {r.label}</small>
            </span>
          </button>
        ))
      )}
    </Slide>
  );
}

function SlideStats({ data }: { data: HomeData }) {
  const s = data.stats;
  const tasksTotal = s.tasks_open + s.tasks_done;
  return (
    <Slide title="Статистика" icon={<IconChart size={20} />} tone="tone-orange" onMore={() => navigate("/stats")}>
      <div className="stat-tiles">
        <div><b>{s.active}</b><span>{plural(s.active, ["дело", "дела", "дел"])}</span></div>
        <div><b>{percent(s.happened_share)}</b><span>состоялось</span></div>
        <div><b>{s.avg_rating ? s.avg_rating.toFixed(1) : "—"}</b><span>оценка</span></div>
        <div><b>{tasksTotal ? percent(s.tasks_done / tasksTotal) : "—"}</b><span>задач готово</span></div>
      </div>
    </Slide>
  );
}
