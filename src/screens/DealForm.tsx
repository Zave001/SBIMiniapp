import { useEffect, useState } from "react";
import { ApiError, patch, post } from "../api";
import { DURATIONS, REMINDER_PRESETS, toInputValue } from "../format";
import { useApi, useBackButton } from "../hooks";
import { navigate } from "../router";
import { alertMessage, haptic } from "../telegram";
import type { DealFull, Me } from "../types";
import { Card, Chip, Screen, Section, Spinner, Toggle } from "../components/ui";

interface FormState {
  title: string;
  type: string;
  start: string;
  duration_min: number;
  location: string;
  participants: string;
  comment: string;
  important: boolean;
  recurrence: string;
  reminders: number[];
  tasks: string;
}

const EMPTY: FormState = {
  title: "",
  type: "Другое",
  start: "",
  duration_min: 60,
  location: "",
  participants: "",
  comment: "",
  important: false,
  recurrence: "",
  reminders: [15],
  tasks: "",
};

export function DealForm({ id, me }: { id?: number; me: Me }) {
  useBackButton(true, id ? `/deals/${id}` : "/deals");
  const existing = useApi<{ event: DealFull }>(id ? `/deals/${id}` : null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const d = existing.data?.event;
    if (!d) return;
    setForm({
      title: d.title,
      type: d.type,
      start: toInputValue(d.start),
      duration_min: d.duration_min ?? 60,
      location: d.location ?? "",
      participants: d.participants ?? "",
      comment: d.comment ?? "",
      important: d.important,
      recurrence: d.recurrence ?? "",
      reminders: d.reminders.map((r) => r.minutes_before),
      tasks: "",
    });
  }, [existing.data]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) {
      alertMessage("Укажите название");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        type: form.type,
        location: form.location,
        participants: form.participants,
        comment: form.comment,
        important: form.important,
        recurrence: form.recurrence || "none",
      };
      if (form.start) {
        body.start = form.start;
        body.duration_min = form.duration_min;
      }
      let dealId = id;
      if (id) {
        await patch(`/deals/${id}`, body);
      } else {
        body.reminders = form.start ? form.reminders : [];
        body.tasks = form.tasks.split("\n").map((t) => t.trim()).filter(Boolean);
        const created = await post<{ event: DealFull }>("/deals", body);
        dealId = created.event.id;
      }
      haptic.success();
      navigate(`/deals/${dealId}`, true);
    } catch (e) {
      haptic.error();
      alertMessage((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  };

  if (id && existing.loading && !existing.data) return <Spinner />;

  return (
    <Screen title={id ? "Изменить дело" : "Новое дело"}>
      <Card>
        <label className="field">
          <span>Название</span>
          <input autoFocus={!id} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Созвон с командой" />
        </label>
        <label className="field">
          <span>Тип</span>
          <select value={form.type} onChange={(e) => set("type", e.target.value)}>
            {me.event_types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <div className="field-row">
          <label className="field">
            <span>Начало</span>
            <input type="datetime-local" value={form.start} onChange={(e) => set("start", e.target.value)} />
          </label>
          <label className="field narrow">
            <span>Длительность</span>
            <select value={form.duration_min} onChange={(e) => set("duration_min", Number(e.target.value))} disabled={!form.start}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} мин</option>)}
            </select>
          </label>
        </div>
        <p className="hint small">Время — в вашем часовом поясе ({me.timezone}).</p>
      </Card>

      <Card>
        <label className="field">
          <span>Место</span>
          <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Офис, Zoom…" />
        </label>
        <label className="field">
          <span>Участники</span>
          <input value={form.participants} onChange={(e) => set("participants", e.target.value)} placeholder="Имена или e-mail через запятую" />
        </label>
        <label className="field">
          <span>Комментарий</span>
          <textarea rows={4} value={form.comment} onChange={(e) => set("comment", e.target.value)} placeholder="Контекст, договорённости" />
        </label>
      </Card>

      <Card>
        <Toggle checked={form.important} onChange={(v) => set("important", v)} label="⭐ Важное" hint="Покажется в «Важном» и красным в Google" />
        <label className="field">
          <span>Повтор</span>
          <select value={form.recurrence} onChange={(e) => set("recurrence", e.target.value)}>
            <option value="">Не повторять</option>
            {me.recurrence_rules.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
      </Card>

      {!id && form.start && (
        <Section title="Напоминания">
          <Card>
            <div className="chips-wrap">
              {REMINDER_PRESETS.map((p) => {
                const on = form.reminders.includes(p.value);
                return (
                  <Chip
                    key={p.value}
                    active={on}
                    onClick={() => set("reminders", on ? form.reminders.filter((x) => x !== p.value) : [...form.reminders, p.value])}
                  >
                    {on ? "✓ " : ""}{p.label}
                  </Chip>
                );
              })}
            </div>
          </Card>
        </Section>
      )}

      {!id && (
        <Section title="Задачи">
          <Card>
            <textarea rows={3} value={form.tasks} onChange={(e) => set("tasks", e.target.value)} placeholder={"По одной на строку:\nПодготовить презентацию\nОтправить договор"} />
          </Card>
        </Section>
      )}

      <div className="actions sticky">
        <button className="btn big" disabled={saving} onClick={save}>
          {saving ? "Сохраняю…" : id ? "Сохранить" : "Создать дело"}
        </button>
      </div>
    </Screen>
  );
}
