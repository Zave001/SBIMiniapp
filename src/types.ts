export type Period = "past" | "upcoming" | "now" | "undated";

export interface TaskNote {
  id: number;
  text: string;
  at: string;
}

export interface Task {
  id: number;
  event_id: number;
  event_title?: string;
  title: string;
  done: boolean;
  important: boolean;
  assignee: string | null;
  due: string | null;
  due_label: string | null;
  overdue: boolean;
  notes: TaskNote[];
}

export interface Reminder {
  id: number;
  minutes_before: number;
  label: string;
  at: string | null;
  sent: boolean;
}

export interface Deal {
  id: number;
  title: string;
  type: string;
  status: string;
  important: boolean;
  start: string | null;
  end: string | null;
  duration_min: number | null;
  location: string | null;
  participants: string | null;
  period: Period;
  when: string;
  recurrence: string | null;
  recurrence_label: string | null;
  tasks_total: number;
  tasks_done: number;
  synced: boolean;
  sync_pending: boolean;
}

export interface DealFull extends Deal {
  comment: string | null;
  happened: boolean | null;
  outcome: string | null;
  rating: number | null;
  what_happened: string | null;
  next_steps: string | null;
  next_steps_deadline: string | null;
  reschedule_count: number;
  notes: { text: string; at: string }[];
  tasks: Task[];
  reminders: Reminder[];
}

export interface Me {
  user: { id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string };
  /** Пояс из настроек бота (IANA). */
  timezone: string;
  /** Разница с Москвой: «+4 мск», «мск». */
  msk_offset?: string;
  openai_connected: boolean;
  google_available: boolean;
  google_connected: boolean;
  is_owner: boolean;
  event_types: string[];
  outcomes: string[];
  recurrence_rules: { value: string; label: string }[];
}

export interface HomeReminder {
  kind: "deal" | "task";
  event_id: number;
  task_id?: number;
  title: string;
  at: string;
  at_label: string;
  label: string;
}

export interface Home {
  now: Deal[];
  upcoming: Deal[];
  today: Deal[];
  important: { deals: Deal[]; tasks: Task[] };
  tasks_today: Task[];
  overdue: Task[];
  reminders: HomeReminder[];
  awaiting_outcome: Deal[];
  stats: {
    total: number;
    active: number;
    happened: number;
    happened_share: number;
    success_share: number;
    avg_rating: number | null;
    tasks_open: number;
    tasks_done: number;
  };
}

export interface Stats {
  summary: {
    total: number;
    active: number;
    cancelled: number;
    happened: number;
    success: number;
    partial: number;
    failed: number;
    happened_share: number;
    success_share: number;
    avg_rating: number | null;
    avg_reschedule: number | null;
    avg_duration: number | null;
  };
  by_type: { event_type: string; total: number; happened: number; cancelled: number }[];
  weeks: { week: string; total: number; happened: number; cancelled: number }[];
  ratings: Record<string, number>;
  tasks: { open: number; done: number; overdue: number; important: number };
}

export interface UserSettings {
  user_id: number;
  timezone: string;
  timezone_set: boolean;
  msk_offset?: string;
  digest_enabled: boolean;
  digest_time: string;
  followup_enabled: boolean;
  followup_delay_min: number;
}

export interface AllowedUser {
  id: number;
  name: string | null;
  label: string;
  from_env: boolean;
  is_me: boolean;
  removable: boolean;
}

export interface SearchResult {
  kind: string;
  kind_label: string;
  event: Deal;
  task_id: number | null;
  task_title: string | null;
  snippet: string;
}
