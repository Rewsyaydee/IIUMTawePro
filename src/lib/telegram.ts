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
  onEvent: (eventType: string, eventHandler: () => void) => void;
  offEvent: (eventType: string, eventHandler: () => void) => void;
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
  applyTelegramTheme(webApp.themeParams);

  const handleThemeChanged = () => applyTelegramTheme(webApp.themeParams);
  webApp.onEvent?.("themeChanged", handleThemeChanged);
}

export function applyTelegramTheme(theme: TelegramThemeParams = {}) {
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
