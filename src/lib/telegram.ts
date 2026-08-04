type TelegramButton = {
  show: () => void;
  hide: () => void;
  setText: (text: string) => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
};

type TelegramHaptics = {
  impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  notificationOccurred: (type: "error" | "success" | "warning") => void;
  selectionChanged: () => void;
};

type TelegramThemeParams = Record<string, string | undefined>;

type TelegramLocationData = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  course: number | null;
  speed: number | null;
  horizontal_accuracy: number | null;
  vertical_accuracy: number | null;
  course_accuracy: number | null;
  speed_accuracy: number | null;
};

type TelegramLocationManager = {
  isInited: boolean;
  isLocationAvailable: boolean;
  isAccessRequested: boolean;
  isAccessGranted: boolean;
  init: (callback?: () => void) => void;
  getLocation: (callback: (data: TelegramLocationData | null) => void) => void;
  openSettings: () => void;
};

type TelegramStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<boolean>;
  removeItem: (key: string) => Promise<boolean>;
  getKeys: () => Promise<string[]>;
};

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: {
    user?: {
      id?: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
    start_param?: string;
  };
  version: string;
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  safeAreaInset?: { top: number; bottom: number; left: number; right: number };
  contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
  BackButton?: TelegramButton;
  BottomButton?: TelegramButton;
  SecondaryButton?: TelegramButton;
  HapticFeedback?: TelegramHaptics;
  LocationManager?: TelegramLocationManager;
  SecureStorage?: TelegramStorage;
  DeviceStorage?: TelegramStorage;
  isFullscreen?: boolean;
  ready: () => void;
  expand: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  disableVerticalSwipes?: () => void;
  enableVerticalSwipes?: () => void;
  isVersionAtLeast: (version: string) => boolean;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
  openLink: (url: string) => void;
  openInvoice?: (url: string, callback?: (status: string) => void) => void;
  shareToStory?: (mediaUrl: string, params?: { text?: string; widget_link?: { url: string; name?: string } }) => void;
  shareMessage?: (messageId: string, callback?: (sent: boolean) => void) => void;
  downloadFile?: (params: { url: string; file_name: string }, callback?: (accepted: boolean) => void) => void;
  onEvent: (eventType: string, eventHandler: (...args: any[]) => void) => void;
  offEvent: (eventType: string, eventHandler: (...args: any[]) => void) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp() {
  return window.Telegram?.WebApp;
}

export function setupTelegramShell() {
  const webApp = getTelegramWebApp();
  if (!webApp) return;

  webApp.ready();
  webApp.expand();
  if (webApp.isVersionAtLeast?.("8.0")) {
    try {
      webApp.requestFullscreen?.();
      webApp.disableVerticalSwipes?.();
    } catch {
      undefined;
    }
  }
  applyTelegramTheme(webApp.themeParams, webApp.colorScheme);

  const handleThemeChanged = () => applyTelegramTheme(webApp.themeParams, webApp.colorScheme);
  webApp.onEvent?.("themeChanged", handleThemeChanged);
}

export function applyTelegramTheme(theme: TelegramThemeParams = {}, colorScheme: "light" | "dark" = "dark") {
  const root = document.documentElement;
  const mapping: Record<string, string> = {
    bg_color: "--tg-bg-color",
    text_color: "--tg-text-color",
    hint_color: "--tg-hint-color",
    link_color: "--tg-link-color",
    button_color: "--tg-button-color",
    button_text_color: "--tg-button-text-color",
    secondary_bg_color: "--tg-secondary-bg-color",
    section_bg_color: "--tg-section-bg-color",
    section_header_text_color: "--tg-section-header-text-color",
    subtitle_text_color: "--tg-subtitle-text-color",
    destructive_text_color: "--tg-destructive-text-color"
  };

  Object.entries(mapping).forEach(([key, variable]) => {
    const value = theme[key];
    if (value) root.style.setProperty(variable, value);
  });

  // The hardcoded :root tokens default to dark-mode values; swap them when
  // Telegram reports a light scheme so text stays readable (no white-on-white).
  if (colorScheme === "light") {
    root.style.setProperty("--text-primary", theme.text_color || "#1f2328");
    root.style.setProperty("--text-secondary", "rgba(0, 0, 0, 0.65)");
    root.style.setProperty("--text-muted", "rgba(0, 0, 0, 0.45)");
    root.style.setProperty("--line", "rgba(0, 0, 0, 0.12)");
    root.style.setProperty("--glass-bg", "rgba(255, 255, 255, 0.6)");
    root.style.setProperty("--glass-border", "rgba(0, 0, 0, 0.12)");
  } else {
    root.style.setProperty("--text-primary", "#ffffff");
    root.style.setProperty("--text-secondary", "rgba(255, 255, 255, 0.65)");
    root.style.setProperty("--text-muted", "rgba(255, 255, 255, 0.4)");
    root.style.setProperty("--line", "rgba(255, 255, 255, 0.12)");
    root.style.setProperty("--glass-bg", "rgba(255, 255, 255, 0.07)");
    root.style.setProperty("--glass-border", "rgba(255, 255, 255, 0.12)");
  }
}

export function hapticImpact(style: "light" | "medium" | "heavy" = "light") {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred(style);
}

export function hapticSuccess() {
  getTelegramWebApp()?.HapticFeedback?.notificationOccurred("success");
}

export function hapticError() {
  getTelegramWebApp()?.HapticFeedback?.notificationOccurred("error");
}

export function confirmNative(message: string) {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    return Promise.resolve(window.confirm(message));
  }

  return new Promise<boolean>((resolve) => {
    webApp.showConfirm(message, (confirmed) => resolve(confirmed));
  });
}
