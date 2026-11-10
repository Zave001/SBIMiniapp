// Тонкая обёртка над window.Telegram.WebApp (SDK подключён в index.html).
// Вне Telegram (обычный браузер) все вызовы безопасно ничего не делают.

type HapticImpact = "light" | "medium" | "heavy" | "rigid" | "soft";
type HapticNotice = "error" | "success" | "warning";

interface TgButton {
  show(): void;
  hide(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
  setText?(text: string): void;
  setParams?(params: Record<string, unknown>): void;
  showProgress?(leaveActive?: boolean): void;
  hideProgress?(): void;
  enable?(): void;
  disable?(): void;
}

interface TgWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name?: string }; start_param?: string };
  colorScheme: "light" | "dark";
  version: string;
  platform: string;
  ready(): void;
  expand(): void;
  close(): void;
  isVersionAtLeast(v: string): boolean;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  enableClosingConfirmation?(): void;
  disableClosingConfirmation?(): void;
  disableVerticalSwipes?(): void;
  showConfirm?(message: string, cb: (ok: boolean) => void): void;
  showAlert?(message: string, cb?: () => void): void;
  openTelegramLink?(url: string): void;
  onEvent?(event: string, cb: () => void): void;
  offEvent?(event: string, cb: () => void): void;
  BackButton: TgButton;
  MainButton: TgButton;
  HapticFeedback?: {
    impactOccurred(style: HapticImpact): void;
    notificationOccurred(type: HapticNotice): void;
    selectionChanged(): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export const tg: TgWebApp | undefined = window.Telegram?.WebApp;

export function initTelegram(): void {
  if (!tg) return;
  tg.ready();
  tg.expand();
  try {
    if (tg.isVersionAtLeast("6.1")) {
      tg.setHeaderColor?.("secondary_bg_color");
      tg.setBackgroundColor?.("secondary_bg_color");
    }
    if (tg.isVersionAtLeast("7.7")) tg.disableVerticalSwipes?.();
  } catch {
    /* старые клиенты */
  }
}

export const initData = (): string => tg?.initData ?? "";
export const startParam = (): string | undefined => tg?.initDataUnsafe?.start_param;

export const haptic = {
  tap: () => tg?.HapticFeedback?.impactOccurred("light"),
  select: () => tg?.HapticFeedback?.selectionChanged(),
  success: () => tg?.HapticFeedback?.notificationOccurred("success"),
  error: () => tg?.HapticFeedback?.notificationOccurred("error"),
};

export function confirmAction(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (tg?.showConfirm && tg.isVersionAtLeast("6.2")) tg.showConfirm(message, resolve);
    else resolve(window.confirm(message));
  });
}

export function alertMessage(message: string): void {
  if (tg?.showAlert && tg.isVersionAtLeast("6.2")) tg.showAlert(message);
  else window.alert(message);
}

export function closeApp(): void {
  if (tg) tg.close();
}

/** Системная кнопка «Назад» Telegram: показывает и вешает обработчик. */
export function setBackButton(handler: (() => void) | null): () => void {
  if (!tg || !tg.isVersionAtLeast("6.1")) return () => {};
  if (!handler) {
    tg.BackButton.hide();
    return () => {};
  }
  tg.BackButton.onClick(handler);
  tg.BackButton.show();
  return () => {
    tg.BackButton.offClick(handler);
  };
}
