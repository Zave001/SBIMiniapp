// Даты приходят с сервера в ISO-8601 уже в поясе пользователя из настроек бота
// («2026-11-13T20:00:00+05:00»), поэтому берём «настенные» компоненты прямо из
// строки — без пересчёта поясом браузера (телефон или календарь могут быть в другом
// поясе). Рядом со временем пишем разницу с Москвой: «18:01 (+4 мск)».

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

const MSK_OFFSET_MIN = 180;

/** Разница с Москвой по смещению из ISO: «+4 мск», «−1 мск», «+2:30 мск», «мск». */
export function mskOffset(iso: string | null | undefined): string {
  const m = iso?.match(/([+-])(\d{2}):?(\d{2})$/);
  if (!m) return "";
  const minutes = (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) - MSK_OFFSET_MIN;
  if (minutes === 0) return "мск";
  const abs = Math.abs(minutes);
  const hm = `${Math.floor(abs / 60)}${abs % 60 ? `:${String(abs % 60).padStart(2, "0")}` : ""}`;
  return `${minutes > 0 ? "+" : "−"}${hm} мск`;
}

/** « (+4 мск)» — пометка пояса к времени (пусто, если смещения в строке нет). */
export function zoneSuffix(iso: string | null | undefined): string {
  const label = mskOffset(iso);
  return label ? ` (${label})` : "";
}

/** «18:01 (+4 мск)»; ``zone=false`` — только «18:01». */
export function fmtTime(iso: string | null | undefined, zone = true): string {
  const p = iso ? parts(iso) : null;
  return p ? `${p.hh}:${p.mm}${zone ? zoneSuffix(iso) : ""}` : "";
}

export function fmtDate(iso: string | null | undefined, withTime = true): string {
  const p = iso ? parts(iso) : null;
  if (!p) return "—";
  const weekday = WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
  const date = `${p.d} ${MONTHS[p.m - 1]}, ${weekday}`;
  return withTime ? `${date} · ${p.hh}:${p.mm}${zoneSuffix(iso)}` : date;
}

/** Сегодняшняя дата «YYYY-MM-DD» в поясе из настроек бота (а не браузера). */
export function todayIn(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function fmtDay(iso: string): { day: string; month: string } {
  const p = parts(iso);
  return p ? { day: String(p.d), month: MONTHS[p.m - 1] } : { day: "—", month: "" };
}

/** «YYYY-MM-DDTHH:MM» — значение для полей даты и времени (настенное время из ISO). */
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
