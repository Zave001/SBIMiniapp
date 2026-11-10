import { percent } from "../format";
import { useApi } from "../hooks";
import type { Stats as StatsData } from "../types";
import { Card, ErrorBox, Screen, Section, Spinner } from "../components/ui";

export function Stats() {
  const { data, error, loading, reload } = useApi<StatsData>("/stats");
  if (loading && !data) return <Screen title="Статистика"><Spinner /></Screen>;
  if (error && !data) return <Screen title="Статистика"><ErrorBox message={error.message} onRetry={reload} /></Screen>;
  if (!data) return null;
  const s = data.summary;
  const tasksTotal = data.tasks.open + data.tasks.done;

  return (
    <Screen title="Статистика" subtitle="По всем вашим делам и задачам">
      <div className="tiles">
        <Tile value={s.active} label="дел (без отменённых)" tone="blue" />
        <Tile value={percent(s.happened_share)} label="состоялось" tone="green" />
        <Tile value={percent(s.success_share)} label="успешно" tone="violet" />
        <Tile value={s.avg_rating ? s.avg_rating.toFixed(1) : "—"} label="средняя оценка" tone="orange" />
      </div>

      <Section title="Дела по неделям">
        <Card>
          <WeekBars weeks={data.weeks} />
          <div className="legend">
            <span><i className="dot-total" /> всего</span>
            <span><i className="dot-happened" /> состоялось</span>
          </div>
        </Card>
      </Section>

      <Section title="Задачи">
        <Card>
          <div className="ring-row">
            <Ring value={tasksTotal ? data.tasks.done / tasksTotal : 0} />
            <div className="ring-legend">
              <p><b>{data.tasks.done}</b> выполнено</p>
              <p><b>{data.tasks.open}</b> в работе</p>
              <p className={data.tasks.overdue ? "danger" : ""}><b>{data.tasks.overdue}</b> просрочено</p>
              <p><b>{data.tasks.important}</b> важных открытых</p>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Итоги встреч">
        <Card>
          <Bar label="✅ Успешно" value={s.success} max={Math.max(1, s.happened)} tone="green" />
          <Bar label="◐ Частично" value={s.partial} max={Math.max(1, s.happened)} tone="orange" />
          <Bar label="✖️ Неуспешно" value={s.failed} max={Math.max(1, s.happened)} tone="red" />
          <p className="hint small">
            Отменено: {s.cancelled} · переносов в среднем: {s.avg_reschedule?.toFixed(1) ?? "—"} · длительность: {s.avg_duration ? `${Math.round(s.avg_duration)} мин` : "—"}
          </p>
        </Card>
      </Section>

      {data.by_type.length > 0 && (
        <Section title="По типам">
          <Card>
            {data.by_type.map((t) => (
              <Bar key={t.event_type} label={t.event_type} value={t.total} max={Math.max(...data.by_type.map((x) => x.total), 1)} tone="blue" note={`состоялось ${t.happened}`} />
            ))}
          </Card>
        </Section>
      )}

      <Section title="Оценки">
        <Card>
          <div className="ratings">
            {[5, 4, 3, 2, 1].map((r) => (
              <Bar key={r} label={"★".repeat(r)} value={data.ratings[String(r)] ?? 0} max={Math.max(1, ...Object.values(data.ratings))} tone="orange" />
            ))}
          </div>
        </Card>
      </Section>
    </Screen>
  );
}

function Tile({ value, label, tone }: { value: string | number; label: string; tone: string }) {
  return (
    <div className={`tile tone-${tone}`}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function Bar({ label, value, max, tone, note }: { label: string; value: number; max: number; tone: string; note?: string }) {
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div className={`bar-fill tone-${tone}`} style={{ width: `${Math.round((value / max) * 100)}%` }} />
      </div>
      <span className="bar-value">{value}</span>
      {note && <span className="hint small bar-note">{note}</span>}
    </div>
  );
}

function WeekBars({ weeks }: { weeks: StatsData["weeks"] }) {
  const max = Math.max(1, ...weeks.map((w) => w.total));
  const height = 110;
  const barW = 22;
  const gap = 16;
  const width = weeks.length * (barW + gap);
  return (
    <svg className="week-bars" viewBox={`0 0 ${width} ${height + 22}`} role="img" aria-label="Дела по неделям">
      {weeks.map((w, i) => {
        const x = i * (barW + gap) + gap / 2;
        const total = (w.total / max) * height;
        const happened = (w.happened / max) * height;
        return (
          <g key={w.week}>
            <rect x={x} y={height - total} width={barW} height={total || 2} rx={6} className="bar-total" />
            <rect x={x} y={height - happened} width={barW} height={happened} rx={6} className="bar-happened" />
            {w.total > 0 && <text x={x + barW / 2} y={height - total - 4} textAnchor="middle" className="bar-num">{w.total}</text>}
            <text x={x + barW / 2} y={height + 16} textAnchor="middle" className="bar-axis">{w.week}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Ring({ value }: { value: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <svg width={96} height={96} viewBox="0 0 96 96" className="ring">
      <circle cx={48} cy={48} r={r} className="ring-bg" />
      <circle cx={48} cy={48} r={r} className="ring-fg" strokeDasharray={`${c * value} ${c}`} transform="rotate(-90 48 48)" />
      <text x={48} y={54} textAnchor="middle" className="ring-text">{percent(value)}</text>
    </svg>
  );
}
