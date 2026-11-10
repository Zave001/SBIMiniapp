import { useState } from "react";
import { ApiError, del, patch, post } from "../api";
import { useApi, useBackButton } from "../hooks";
import { navigate } from "../router";
import { alertMessage, closeApp, confirmAction, haptic } from "../telegram";
import type { AllowedUser, Me, UserSettings } from "../types";
import { IconGear, IconGoogle, IconPeople, IconSpark } from "../components/Icons";
import { Card, Chip, ErrorBox, ListRow, Screen, Section, Spinner, Toggle } from "../components/ui";

async function openInChat(screen: "openai" | "google") {
  try {
    await post("/open-in-chat", { screen });
    closeApp();
  } catch (e) {
    alertMessage((e as ApiError).message);
  }
}

export function Profile({ me }: { me: Me }) {
  const name = [me.user.first_name, me.user.last_name].filter(Boolean).join(" ") || "Пользователь";
  return (
    <Screen title="Профиль">
      <Card className="profile-card">
        {me.user.photo_url ? (
          <img className="avatar" src={me.user.photo_url} alt="" />
        ) : (
          <div className="avatar placeholder">{name.slice(0, 1)}</div>
        )}
        <div>
          <h2>{name}</h2>
          <p className="hint small">{me.user.username ? `@${me.user.username} · ` : ""}ID {me.user.id}</p>
          <p className="hint small">🌍 {me.timezone}</p>
        </div>
      </Card>

      <Section title="Аккаунты">
        <Card>
          <ListRow
            icon={<IconSpark />}
            title="Подписка OpenAI"
            subtitle={me.openai_connected ? "Подключена · общая для всех пользователей" : "Не подключена"}
            right={<Chip tone={me.openai_connected ? "success" : "danger"}>{me.openai_connected ? "вкл" : "выкл"}</Chip>}
          />
          <div className="row-buttons">
            <button className="btn ghost small" onClick={() => openInChat("openai")}>
              {me.openai_connected ? "🔄 Сменить подписку" : "🔐 Войти"} — в чате
            </button>
          </div>
          <ListRow
            icon={<IconGoogle />}
            title="Google Календарь"
            subtitle={
              !me.google_available ? "Не настроен на сервере" : me.google_connected ? "Подключён · дела синхронизируются" : "Не подключён"
            }
            right={<Chip tone={me.google_connected ? "success" : "default"}>{me.google_connected ? "вкл" : "выкл"}</Chip>}
          />
          {me.google_available && (
            <div className="row-buttons">
              <button className="btn ghost small" onClick={() => openInChat("google")}>
                {me.google_connected ? "Управлять" : "Подключить"} — в чате
              </button>
            </div>
          )}
        </Card>
      </Section>

      <Section>
        <Card>
          <ListRow icon={<IconGear />} title="Настройки" subtitle="Часовой пояс, сводка, вопрос после встречи" onClick={() => navigate("/profile/settings")} />
          <ListRow icon={<IconPeople />} title="Пользователи" subtitle="Кто имеет доступ к боту" onClick={() => navigate("/profile/users")} />
        </Card>
      </Section>
    </Screen>
  );
}

export function SettingsScreen() {
  useBackButton(true, "/profile");
  const { data, error, loading, reload, setData } = useApi<{
    settings: UserSettings;
    timezones: { value: string; label: string }[];
  }>("/settings");

  const update = async (changes: Partial<UserSettings>) => {
    try {
      const result = await patch<{ settings: UserSettings }>("/settings", changes);
      setData((prev) => prev && { ...prev, settings: result.settings });
      haptic.success();
    } catch (e) {
      haptic.error();
      alertMessage((e as ApiError).message);
    }
  };

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorBox message={error.message} onRetry={reload} />;
  if (!data) return null;
  const s = data.settings;
  const known = data.timezones.some((t) => t.value === s.timezone);

  return (
    <Screen title="Настройки">
      <Section title="🌍 Часовой пояс">
        <Card>
          <select value={s.timezone} onChange={(e) => update({ timezone: e.target.value })}>
            {!known && <option value={s.timezone}>{s.timezone}</option>}
            {data.timezones.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <TimezoneInput onSave={(tz) => update({ timezone: tz })} />
          <p className="hint small">Все даты в боте, приложении и Google Календаре — в этом поясе.</p>
        </Card>
      </Section>

      <Section title="☀️ Утренняя сводка">
        <Card>
          <Toggle checked={s.digest_enabled} onChange={(v) => update({ digest_enabled: v })} label="Присылать сводку" hint="Дела, задачи на день, просроченное и важное" />
          <label className="field">
            <span>Время</span>
            <input type="time" value={s.digest_time} disabled={!s.digest_enabled} onChange={(e) => e.target.value && update({ digest_time: e.target.value })} />
          </label>
        </Card>
      </Section>

      <Section title="📝 Вопрос после встречи">
        <Card>
          <Toggle checked={s.followup_enabled} onChange={(v) => update({ followup_enabled: v })} label="Спрашивать об итогах" hint="Бот предложит записать итоги и поручения" />
          <label className="field">
            <span>Через сколько после окончания</span>
            <select value={s.followup_delay_min} disabled={!s.followup_enabled} onChange={(e) => update({ followup_delay_min: Number(e.target.value) })}>
              {[0, 15, 30, 60, 120].map((m) => <option key={m} value={m}>{m === 0 ? "Сразу" : `${m} мин`}</option>)}
            </select>
          </label>
        </Card>
      </Section>
    </Screen>
  );
}

function TimezoneInput({ onSave }: { onSave: (tz: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="add-line">
      <input placeholder="Другой: Europe/Berlin" value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="btn small" disabled={!value.trim()} onClick={() => { onSave(value.trim()); setValue(""); }}>OK</button>
    </div>
  );
}

export function UsersScreen() {
  useBackButton(true, "/profile");
  const { data, error, loading, reload } = useApi<{ users: AllowedUser[] }>("/users");
  const [id, setId] = useState("");
  const [name, setName] = useState("");

  const add = async () => {
    try {
      const result = await post<{ added: boolean }>("/users", { id: Number(id), name: name || null });
      haptic.success();
      alertMessage(result.added ? "Доступ выдан. Пусть человек откроет бота и отправит /start." : "У пользователя уже есть доступ.");
      setId("");
      setName("");
      void reload();
    } catch (e) {
      haptic.error();
      alertMessage((e as ApiError).message);
    }
  };

  const remove = async (u: AllowedUser) => {
    if (!(await confirmAction(`Закрыть доступ для ${u.label}?`))) return;
    try {
      await del(`/users/${u.id}`);
      haptic.success();
      void reload();
    } catch (e) {
      alertMessage((e as ApiError).message);
    }
  };

  return (
    <Screen title="Пользователи" subtitle="Доступ к боту и приложению">
      {loading && !data && <Spinner />}
      {error && <ErrorBox message={error.message} onRetry={reload} />}
      {data && (
        <Card>
          {data.users.map((u) => (
            <ListRow
              key={u.id}
              title={u.label}
              subtitle={[u.is_me && "это вы", u.from_env && "из .env"].filter(Boolean).join(" · ") || undefined}
              right={u.removable ? <button className="btn danger ghost small" onClick={() => remove(u)}>Удалить</button> : <span />}
            />
          ))}
        </Card>
      )}
      <Section title="Добавить">
        <Card>
          <label className="field">
            <span>Telegram ID</span>
            <input inputMode="numeric" value={id} onChange={(e) => setId(e.target.value.replace(/\D/g, ""))} placeholder="123456789" />
          </label>
          <label className="field">
            <span>Имя (необязательно)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Как подписать" />
          </label>
          <button className="btn" disabled={!id} onClick={add}>Выдать доступ</button>
          <p className="hint small">Свой ID человек увидит, если напишет боту, — бот покажет его в ответе «Нет доступа». Пользователей из .env можно изменить только в файле.</p>
        </Card>
      </Section>
    </Screen>
  );
}
