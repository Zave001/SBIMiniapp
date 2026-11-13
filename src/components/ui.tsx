import type { ReactNode } from "react";
import { haptic } from "../telegram";
import { navigate } from "../router";
import { fmtDay, fmtTime, mskOffset } from "../format";
import type { Deal, Task } from "../types";
import { IconChevron, IconPin, IconRepeat, IconStar } from "./Icons";

export function Screen({ title, subtitle, action, children }: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="screen">
      {title && (
        <header className="screen-header">
          <div>
            <h1>{title}</h1>
            {subtitle && <p className="hint">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </div>
  );
}

export function Section({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      {(title || action) && (
        <div className="section-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`card ${onClick ? "clickable" : ""} ${className}`}
      onClick={onClick ? () => { haptic.tap(); onClick(); } : undefined}
      role={onClick ? "button" : undefined}
    >
      {children}
    </div>
  );
}

export function Spinner({ label = "Загружаю…" }: { label?: string }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <span className="hint">{label}</span>
    </div>
  );
}

export function Empty({ emoji = "🌤", text, action }: { emoji?: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-emoji">{emoji}</div>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-box">
      <p>⚠️ {message}</p>
      {onRetry && <button className="btn small" onClick={onRetry}>Повторить</button>}
    </div>
  );
}

export function Chip({ children, tone = "default", onClick, active }: {
  children: ReactNode;
  tone?: "default" | "accent" | "danger" | "success" | "warn";
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <span
      className={`chip ${tone} ${active ? "active" : ""} ${onClick ? "clickable" : ""}`}
      onClick={onClick ? () => { haptic.select(); onClick(); } : undefined}
    >
      {children}
    </span>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          className={o.value === value ? "active" : ""}
          onClick={() => { haptic.select(); onChange(o.value); }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="row toggle-row">
      <div className="row-main">
        <span>{label}</span>
        {hint && <span className="hint small">{hint}</span>}
      </div>
      <input
        type="checkbox"
        className="switch"
        checked={checked}
        onChange={(e) => { haptic.select(); onChange(e.target.checked); }}
      />
    </label>
  );
}

export function ListRow({ icon, title, subtitle, right, onClick }: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className={`row ${onClick ? "clickable" : ""}`} onClick={onClick ? () => { haptic.tap(); onClick(); } : undefined}>
      {icon && <div className="row-icon">{icon}</div>}
      <div className="row-main">
        <span className="row-title">{title}</span>
        {subtitle && <span className="hint small">{subtitle}</span>}
      </div>
      {right ?? (onClick ? <IconChevron size={18} className="hint" /> : null)}
    </div>
  );
}

const PERIOD_TONE: Record<string, string> = { now: "now", upcoming: "upcoming", past: "past", undated: "undated" };

export function DealRow({ deal, compact = false }: { deal: Deal; compact?: boolean }) {
  const day = deal.start ? fmtDay(deal.start) : null;
  const cancelled = deal.status === "отменено";
  return (
    <div
      className={`deal-row clickable ${cancelled ? "cancelled" : ""}`}
      onClick={() => { haptic.tap(); navigate(`/deals/${deal.id}`); }}
    >
      <div className={`date-badge ${PERIOD_TONE[deal.period]}`}>
        {day ? (
          <>
            <b>{day.day}</b>
            <span>{day.month}</span>
          </>
        ) : (
          <span>—</span>
        )}
      </div>
      <div className="row-main">
        <span className="row-title">
          {deal.important && <IconStar size={15} filled className="star" />}
          {deal.title}
        </span>
        <span className="hint small">
          {/* Пояс пишем один раз: в «when» он уже есть, если там названо время. */}
          {deal.start ? `${fmtTime(deal.start, !deal.when.includes("мск"))} · ` : ""}
          {deal.when}
        </span>
        {!compact && (
          <span className="meta">
            {deal.type !== "Другое" && <Chip>{deal.type}</Chip>}
            {deal.recurrence_label && (
              <Chip><IconRepeat size={12} /> {deal.recurrence_label}</Chip>
            )}
            {deal.tasks_total > 0 && (
              <Chip tone={deal.tasks_done === deal.tasks_total ? "success" : "default"}>
                ☑ {deal.tasks_done}/{deal.tasks_total}
              </Chip>
            )}
            {deal.location && (
              <Chip><IconPin size={12} /> {deal.location}</Chip>
            )}
            {cancelled && <Chip tone="danger">отменено</Chip>}
          </span>
        )}
      </div>
    </div>
  );
}

/** Время в узкой колонке: «18:01» и под ним мелко «(+4 мск)». */
export function StackedTime({ iso, fallback = "—" }: { iso: string | null | undefined; fallback?: string }) {
  const time = fmtTime(iso, false);
  if (!time) return <>{fallback}</>;
  const zone = mskOffset(iso);
  return (
    <>
      {time}
      {zone && <small className="tz">({zone})</small>}
    </>
  );
}

/**
 * Дата и время — двумя отдельными полями: на многих телефонах общее поле
 * «datetime-local» открывает только календарь, без выбора времени.
 * Значение — «YYYY-MM-DDTHH:MM» (пусто — не задано) в поясе из настроек бота.
 */
export function DateTimeField({ label, value, onChange, defaultTime = "09:00", zone }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Время, которое подставится при выборе даты, если времени ещё нет. */
  defaultTime?: string;
  /** Подпись пояса, например «+4 мск». */
  zone?: string;
}) {
  const date = value.slice(0, 10);
  const time = value.length >= 16 ? value.slice(11, 16) : "";
  return (
    <div className="field">
      <span>{label}{zone ? ` (${zone})` : ""}</span>
      <div className="dt-row">
        <input
          type="date"
          className="dt-date"
          aria-label={`${label}: дата`}
          value={date}
          onChange={(e) => onChange(e.target.value ? `${e.target.value}T${time || defaultTime}` : "")}
        />
        <input
          type="time"
          className="dt-time"
          aria-label={`${label}: время`}
          value={time}
          disabled={!date}
          onChange={(e) => date && e.target.value && onChange(`${date}T${e.target.value}`)}
        />
        {value && (
          <button type="button" className="dt-clear" aria-label="Очистить" onClick={() => onChange("")}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export function TaskRow({ task, onToggle, showEvent = true }: {
  task: Task;
  onToggle: (task: Task) => void;
  showEvent?: boolean;
}) {
  return (
    <div className={`task-row ${task.done ? "done" : ""}`}>
      <button
        className={`check ${task.done ? "checked" : ""}`}
        aria-label={task.done ? "Вернуть в работу" : "Выполнено"}
        onClick={(e) => { e.stopPropagation(); haptic.tap(); onToggle(task); }}
      >
        {task.done ? "✓" : ""}
      </button>
      <div className="row-main clickable" onClick={() => { haptic.tap(); navigate(`/tasks/${task.id}`); }}>
        <span className="row-title">
          {task.important && <IconStar size={14} filled className="star" />}
          {task.title}
        </span>
        <span className="hint small">
          {task.due_label && <span className={task.overdue ? "danger" : ""}>до {task.due_label}</span>}
          {task.due_label && (task.assignee || (showEvent && task.event_title)) && " · "}
          {task.assignee && <span>{task.assignee}</span>}
          {task.assignee && showEvent && task.event_title && " · "}
          {showEvent && task.event_title && <span>«{task.event_title}»</span>}
          {task.notes.length > 0 && <span> · 📝 {task.notes.length}</span>}
        </span>
      </div>
    </div>
  );
}
