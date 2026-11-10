// Даты приходят с сервера в ISO-8601 уже в поясе пользователя
// («2026-11-13T20:00:00+05:00»), поэтому берём «настенные» компоненты прямо из
// строки — без пересчёта поясом браузера.

const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

interface Parts {
  y: number;
  m: number;
  d: number;
  hh: string;
  mm: string;
}

function parts(iso: string): Parts | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3], hh: m[4], mm: m[5] };
}

export function fmtTime(iso: string | null | undefined): string {
  const p = iso ? parts(iso) : null;
  return p ? `${p.hh}:${p.mm}` : "";
}

export function fmtDate(iso: string | null | undefined, withTime = true): string {
  const p = iso ? parts(iso) : null;
  if (!p) return "—";
  const weekday = WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
  const date = `${p.d} ${MONTHS[p.m - 1]}, ${weekday}`;
  return withTime ? `${date} · ${p.hh}:${p.mm}` : date;
}

export function fmtDay(iso: string): { day: string; month: string } {
  const p = parts(iso);
  return p ? { day: String(p.d), month: MONTHS[p.m - 1] } : { day: "—", month: "" };
}

/** Значение для <input type="datetime-local">. */
export function toInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 16) : "";
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function plural(n: number, forms: [string, string, string]): string {
  const tail = n % 100;
  if (tail >= 11 && tail <= 14) return forms[2];
  if (n % 10 === 1) return forms[0];
  if (n % 10 >= 2 && n % 10 <= 4) return forms[1];
  return forms[2];
}

export function greeting(hour: number): string {
  if (hour < 5) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

export const DURATIONS = [15, 30, 45, 60, 90, 120, 180];
export const REMINDER_PRESETS = [
  { value: 0, label: "В начале" },
  { value: 15, label: "За 15 мин" },
  { value: 60, label: "За час" },
  { value: 180, label: "За 3 часа" },
  { value: 1440, label: "За день" },
  { value: 2880, label: "За 2 дня" },
];
