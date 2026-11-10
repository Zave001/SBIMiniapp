import { useState } from "react";
import { ApiError, del, patch, post } from "../api";
import { fmtDate, REMINDER_PRESETS } from "../format";
import { useApi, useBackButton } from "../hooks";
import { navigate } from "../router";
import { alertMessage, confirmAction, haptic } from "../telegram";
import type { DealFull, Me, Task } from "../types";
import { IconPeople, IconPin, IconRepeat, IconStar, IconTrash } from "../components/Icons";
import { Card, Chip, ErrorBox, Section, Spinner, TaskRow } from "../components/ui";

export function DealDetail({ id, me }: { id: number; me: Me }) {
  useBackButton(true, "/deals");
  const { data, error, loading, reload, setData } = useApi<{ event: DealFull }>(`/deals/${id}`);
  const [busy, setBusy] = useState(false);
  const deal = data?.event;

  const run = async (action: () => Promise<{ event?: DealFull } | unknown>, success?: string) => {
    setBusy(true);
    try {
      const result = (await action()) as { event?: DealFull };
      if (result && result.event) setData({ event: result.event });
      else await reload();
      haptic.success();
      if (success) alertMessage(success);
    } catch (e) {
      haptic.error();
      alertMessage((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !deal) return <Spinner />;
  if (error && !deal) return <ErrorBox message={error.message} onRetry={reload} />;
  if (!deal) return null;

  const past = deal.period === "past" || deal.period === "now";
  const cancelled = deal.status === "отменено";

  return (
    <div className="screen detail">
      <div className={`detail-hero ${deal.important ? "important" : ""} ${cancelled ? "cancelled" : ""}`}>
        <div className="detail-hero-top">
          <Chip tone="accent">{deal.type}</Chip>
          <button
            className={`icon-btn star-btn ${deal.important ? "on" : ""}`}
            aria-label="Важное"
            disabled={busy}
            onClick={() => run(() => patch(`/deals/${id}`, { important: !deal.important }))}
          >
            <IconStar filled={deal.important} />
          </button>
        </div>
        <h1>{deal.title}</h1>
        <p className="detail-when">{deal.start ? fmtDate(deal.start) : "Без даты"}</p>
        <p className="hint">{deal.when}{deal.duration_min ? ` · ${deal.duration_min} мин` : ""}</p>
        <div className="meta">
          {deal.recurrence_label && <Chip><IconRepeat size={12} /> {deal.recurrence_label}</Chip>}
          {cancelled && <Chip tone="danger">отменено</Chip>}
          {deal.status === "завершено" && <Chip tone="success">завершено</Chip>}
          {deal.synced && <Chip tone="success">Google ✓</Chip>}
          {deal.sync_pending && <Chip tone="warn">ждёт синхронизации</Chip>}
        </div>
      </div>

      {(deal.location || deal.participants) && (
        <Card>
          {deal.location && <p className="info-line"><IconPin size={17} /> {deal.location}</p>}
          {deal.participants && <p className="info-line"><IconPeople size={17} /> {deal.participants}</p>}
        </Card>
      )}

      <CommentBlock deal={deal} busy={busy} onSave={(comment) => run(() => patch(`/deals/${id}`, { comment }))} />

      <Section title={`Задачи${deal.tasks.length ? ` · ${deal.tasks.filter((t) => t.done).length}/${deal.tasks.length}` : ""}`}>
        <Card>
          {deal.tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              showEvent={false}
              onToggle={(task: Task) => run(() => patch(`/tasks/${task.id}`, { done: !task.done }))}
            />
          ))}
          <AddLine
            placeholder="Новая задача…"
            disabled={busy}
            onAdd={(title) => run(() => post(`/deals/${id}/tasks`, { title }))}
          />
        </Card>
      </Section>

      {deal.start && (
        <Section title="Напоминания">
          <Card>
            <div className="chips-wrap">
              {deal.reminders.length === 0 && <span className="hint small">Нет напоминаний</span>}
              {deal.reminders.map((r) => (
                <Chip key={r.id} tone={r.sent ? "default" : "accent"}>
                  🔔 {r.label}{r.sent ? " · отправлено" : ""}
                  <button
                    className="chip-x"
                    aria-label="Удалить"
                    onClick={() => run(() => del(`/deals/${id}/reminders/${r.id}`))}
                  >
                    ×
                  </button>
                </Chip>
              ))}
            </div>
            <div className="chips-wrap">
              {REMINDER_PRESETS.filter((p) => !deal.reminders.some((r) => r.minutes_before === p.value)).map((p) => (
                <Chip key={p.value} onClick={() => run(() => post(`/deals/${id}/reminders`, { minutes_before: p.value }))}>
                  + {p.label}
                </Chip>
              ))}
            </div>
          </Card>
        </Section>
      )}

      {past && !cancelled && <OutcomeBlock deal={deal} me={me} busy={busy} onSave={(body) => run(() => post(`/deals/${id}/outcome`, body))} />}

      <Section title={`Заметки${deal.notes.length ? ` · ${deal.notes.length}` : ""}`}>
        <Card>
          {deal.notes.map((n, i) => (
            <div key={i} className="note">
              <span className="hint small">{fmtDate(n.at)}</span>
              <p>{n.text}</p>
            </div>
          ))}
          <AddLine placeholder="Добавить заметку…" disabled={busy} onAdd={(text) => run(() => post(`/deals/${id}/notes`, { text }))} />
        </Card>
      </Section>

      <div className="actions">
        <button className="btn" disabled={busy} onClick={() => navigate(`/deals/${id}/edit`)}>Изменить</button>
        {!cancelled && (
          <button
            className="btn danger ghost"
            disabled={busy}
            onClick={async () => {
              if (await confirmAction(`Отменить «${deal.title}»? Событие удалится из Google Календаря.`)) {
                await run(() => post(`/deals/${id}/cancel`));
              }
            }}
          >
            <IconTrash size={18} /> Отменить дело
          </button>
        )}
      </div>
    </div>
  );
}

function CommentBlock({ deal, busy, onSave }: { deal: DealFull; busy: boolean; onSave: (comment: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(deal.comment ?? "");
  return (
    <Section
      title="Комментарий"
      action={!editing && <button className="link" onClick={() => { setText(deal.comment ?? ""); setEditing(true); }}>Изменить</button>}
    >
      <Card>
        {editing ? (
          <>
            <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Договорённости, контекст, детали…" />
            <div className="row-buttons">
              <button className="btn ghost small" onClick={() => setEditing(false)}>Отмена</button>
              <button className="btn small" disabled={busy} onClick={() => { onSave(text); setEditing(false); }}>Сохранить</button>
            </div>
          </>
        ) : deal.comment ? (
          <p className="pre">{deal.comment}</p>
        ) : (
          <p className="hint">Пока пусто — добавьте договорённости и контекст.</p>
        )}
      </Card>
    </Section>
  );
}

function OutcomeBlock({ deal, me, busy, onSave }: {
  deal: DealFull;
  me: Me;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [what, setWhat] = useState(deal.what_happened ?? "");
  const [next, setNext] = useState(deal.next_steps ?? "");
  const [rating, setRating] = useState<number>(deal.rating ?? 0);
  const recorded = deal.happened !== null;
  return (
    <Section title="Итог">
      <Card className={recorded ? "" : "accent-soft"}>
        {recorded && (
          <p>
            {deal.happened ? "✅ Состоялось" : "✖️ Не состоялось"}
            {deal.outcome ? ` · ${deal.outcome}` : ""}
            {deal.rating ? ` · ${"★".repeat(deal.rating)}` : ""}
          </p>
        )}
        <div className="chips-wrap">
          {me.outcomes.map((o) => (
            <Chip key={o} active={deal.outcome === o} onClick={() => onSave({ happened: true, outcome: o, rating: rating || null, what_happened: what, next_steps: next })}>
              {o === "успешно" ? "✅" : o === "частично" ? "◐" : "✖️"} {o}
            </Chip>
          ))}
          <Chip active={deal.happened === false} onClick={() => onSave({ happened: false })}>Не состоялось</Chip>
        </div>
        <div className="rating">
          {[1, 2, 3, 4, 5].map((v) => (
            <button key={v} className={v <= rating ? "on" : ""} onClick={() => { haptic.select(); setRating(v); }}>★</button>
          ))}
        </div>
        <textarea rows={3} placeholder="Что обсудили и решили" value={what} onChange={(e) => setWhat(e.target.value)} />
        <textarea rows={2} placeholder="Следующие шаги" value={next} onChange={(e) => setNext(e.target.value)} />
        <button
          className="btn small"
          disabled={busy}
          onClick={() => onSave({ happened: true, outcome: deal.outcome, rating: rating || null, what_happened: what, next_steps: next })}
        >
          Сохранить итог
        </button>
      </Card>
    </Section>
  );
}

export function AddLine({ placeholder, onAdd, disabled }: { placeholder: string; onAdd: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onAdd(value);
    setText("");
  };
  return (
    <div className="add-line">
      <input
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
      />
      <button className="btn small" disabled={disabled || !text.trim()} onClick={submit}>Добавить</button>
    </div>
  );
}
