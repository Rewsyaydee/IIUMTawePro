export type PerformanceClass = "LOW" | "AVERAGE" | "HIGH";

export interface DeviceInfo {
  isAndroid: boolean;
  performanceClass: PerformanceClass;
  manufacturer: string | null;
  model: string | null;
  androidVersion: string | null;
}

const TELEGRAM_ANDROID_RE = /Telegram-Android\/([\d.]+) \(([^;]+) ([^;]+); Android ([\d.]+); SDK (\d+); (LOW|AVERAGE|HIGH)\)/;

let cached: DeviceInfo | null = null;

export function getDeviceInfo(): DeviceInfo {
  if (cached) return cached;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const match = ua.match(TELEGRAM_ANDROID_RE);

  if (match) {
    cached = {
      isAndroid: true,
      manufacturer: match[2].trim(),
      model: match[3].trim(),
      androidVersion: match[4],
      performanceClass: match[6] as PerformanceClass
    };
  } else {
    const isAndroid = /Android/i.test(ua);
    cached = {
      isAndroid,
      manufacturer: null,
      model: null,
      androidVersion: null,
      performanceClass: isAndroid ? "AVERAGE" : "HIGH"
    };
  }

  return cached;
}

export function getPerformanceClass(): PerformanceClass {
  return getDeviceInfo().performanceClass;
}

export function isLowPerformance(): boolean {
  return getPerformanceClass() === "LOW";
}
