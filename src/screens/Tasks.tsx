import { useState } from "react";
import { ApiError, del, patch, post } from "../api";
import { fmtDate, mskOffset, toInputValue } from "../format";
import { useApi, useBackButton } from "../hooks";
import { goBack, navigate } from "../router";
import { alertMessage, confirmAction, haptic } from "../telegram";
import type { Deal, Task } from "../types";
import { IconStar, IconTrash } from "../components/Icons";
import { Card, DateTimeField, Empty, ErrorBox, ListRow, Screen, Section, Segmented, Spinner, TaskRow } from "../components/ui";
import { AddLine } from "./DealDetail";

type Filter = "open" | "today" | "overdue" | "week" | "important" | "nodue" | "done";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "open", label: "Все" },
  { value: "today", label: "Сегодня" },
  { value: "overdue", label: "Просрочено" },
  { value: "week", label: "Неделя" },
  { value: "important", label: "⭐" },
  { value: "nodue", label: "Без срока" },
  { value: "done", label: "Готово" },
];

const EMPTY_TEXT: Record<Filter, string> = {
  open: "Открытых задач нет 🎉",
  today: "На сегодня задач нет",
  overdue: "Просроченных нет — отлично!",
  week: "На неделе задач со сроком нет",
  important: "Важных задач нет",
  nodue: "Все задачи со сроком",
  done: "Пока ничего не выполнено",
};

export function Tasks() {
  const [filter, setFilter] = useState<Filter>("open");
  const { data, error, loading, reload, setData } = useApi<{ tasks: Task[] }>(`/tasks?filter=${filter}`);

  const toggle = async (task: Task) => {
    setData((prev) => prev && { tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)) });
    try {
      await patch(`/tasks/${task.id}`, { done: !task.done });
      if (!task.done) haptic.success();
    } catch (e) {
      alertMessage((e as ApiError).message);
    } finally {
      window.setTimeout(() => void reload(), 400);
    }
  };

  return (
    <Screen title="Задачи" subtitle="Все поручения из всех дел">
      <div className="scroll-x">
        <Segmented value={filter} options={FILTERS} onChange={setFilter} />
      </div>
      {loading && !data && <Spinner />}
      {error && <ErrorBox message={error.message} onRetry={reload} />}
      {data && data.tasks.length === 0 && <Empty emoji="☑️" text={EMPTY_TEXT[filter]} />}
      {data && data.tasks.length > 0 && (
        <div className="card list">
          {data.tasks.map((t) => <TaskRow key={t.id} task={t} onToggle={toggle} />)}
        </div>
      )}
    </Screen>
  );
}

export function TaskDetail({ id }: { id: number }) {
  useBackButton(true, "/tasks");
  const { data, error, loading, reload, setData } = useApi<{ task: Task; event: Deal }>(`/tasks/${id}`);
  const [busy, setBusy] = useState(false);

  const update = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const result = await patch<{ task: Task }>(`/tasks/${id}`, body);
      setData((prev) => prev && { ...prev, task: result.task });
      haptic.success();
    } catch (e) {
      haptic.error();
      alertMessage((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorBox message={error.message} onRetry={reload} />;
  if (!data) return null;
  const { task, event } = data;

  return (
    <div className="screen detail">
      <div className={`detail-hero ${task.important ? "important" : ""}`}>
        <div className="detail-hero-top">
          <span className={`status-pill ${task.done ? "success" : task.overdue ? "danger" : ""}`}>
            {task.done ? "✅ Выполнена" : task.overdue ? "⚠️ Просрочена" : "В работе"}
          </span>
          <button className={`icon-btn star-btn ${task.important ? "on" : ""}`} disabled={busy} onClick={() => update({ important: !task.important })}>
            <IconStar filled={task.important} />
          </button>
        </div>
        <h1>{task.title}</h1>
      </div>

      <Card>
        <ListRow title={`«${event.title}»`} subtitle={event.when} onClick={() => navigate(`/deals/${event.id}`)} />
        <DateTimeField
          label="Срок"
          value={toInputValue(task.due)}
          onChange={(value) => update({ due: value || null })}
          defaultTime="23:59"
          zone={mskOffset(task.due) || undefined}
        />
        <p className="hint small">Напомню о сроке за сутки и за час.</p>
        <AssigneeField value={task.assignee ?? ""} onSave={(assignee) => update({ assignee })} />
      </Card>

      <Section title={`Заметки${task.notes.length ? ` · ${task.notes.length}` : ""}`}>
        <Card>
          {task.notes.length === 0 && <p className="hint">Записывайте шаги и статус: «подали заявку», «ждём ответа».</p>}
          {task.notes.map((n) => (
            <div key={n.id} className="note">
              <span className="hint small">{fmtDate(n.at)}</span>
              <p>{n.text}</p>
            </div>
          ))}
          <AddLine
            placeholder="Новая заметка…"
            disabled={busy}
            onAdd={async (text) => {
              setBusy(true);
              try {
                const result = await post<{ task: Task }>(`/tasks/${id}/notes`, { text });
                setData((prev) => prev && { ...prev, task: result.task });
                haptic.success();
              } catch (e) {
                alertMessage((e as ApiError).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </Card>
      </Section>

      <div className="actions">
        <button className="btn big" disabled={busy} onClick={() => update({ done: !task.done })}>
          {task.done ? "↩️ Вернуть в работу" : "✅ Выполнено"}
        </button>
        <button
          className="btn danger ghost"
          disabled={busy}
          onClick={async () => {
            const notes = task.notes.length ? ` и ${task.notes.length} заметок` : "";
            if (await confirmAction(`Удалить задачу «${task.title}»${notes}?`)) {
              await del(`/tasks/${id}`);
              haptic.success();
              goBack("/tasks");
            }
          }}
        >
          <IconTrash size={18} /> Удалить
        </button>
      </div>
    </div>
  );
}

function AssigneeField({ value, onSave }: { value: string; onSave: (value: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <label className="field">
      <span>Исполнитель</span>
      <input
        value={text}
        placeholder="Кто отвечает"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { if (text.trim() !== value) onSave(text.trim()); }}
      />
    </label>
  );
}
