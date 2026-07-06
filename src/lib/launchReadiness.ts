import { getTelegramWebApp } from "./telegram";

export type LaunchStatus = "ready" | "warning" | "missing";

export type LaunchCheck = {
  id: string;
  title: string;
  detail: string;
  status: LaunchStatus;
  owner: string;
  action: string;
};

export type LaunchMilestone = {
  title: string;
  detail: string;
  status: LaunchStatus;
};

const env = import.meta.env;

function hasValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function envMode() {
  return hasValue(env.VITE_APP_MODE) ? String(env.VITE_APP_MODE) : env.DEV ? "development" : "production";
}

export function getLaunchReadiness() {
  const webApp = getTelegramWebApp();
  const mockMode = env.VITE_ENABLE_MOCKS !== "false";
  const mode = envMode();

  const checks: LaunchCheck[] = [
    {
      id: "telegram-context",
      title: "Telegram launch context",
      detail: webApp?.initData
        ? "Telegram init data is available in the runtime."
        : "Running in browser preview, so Telegram init data is not present.",
      status: webApp?.initData ? "ready" : "warning",
      owner: "Frontend",
      action: "Test inside Telegram before release."
    },
    {
      id: "mock-mode",
      title: "Mock mode control",
      detail: mockMode ? "Mock data is still enabled for demos." : "Mock data has been disabled by environment.",
      status: mockMode ? "warning" : "ready",
      owner: "Frontend",
      action: "Set VITE_ENABLE_MOCKS=false for production."
    },
    {
      id: "supabase-url",
      title: "Supabase project URL",
      detail: hasValue(env.VITE_SUPABASE_URL) ? "Client can locate the Supabase project." : "Supabase URL is not configured.",
      status: hasValue(env.VITE_SUPABASE_URL) ? "ready" : "missing",
      owner: "Backend",
      action: "Set VITE_SUPABASE_URL."
    },
    {
      id: "supabase-anon",
      title: "Supabase anon key",
      detail: hasValue(env.VITE_SUPABASE_ANON_KEY) ? "Client anon key is configured." : "Client anon key is not configured.",
      status: hasValue(env.VITE_SUPABASE_ANON_KEY) ? "ready" : "missing",
      owner: "Backend",
      action: "Set VITE_SUPABASE_ANON_KEY."
    },
    {
      id: "api-base",
      title: "Server API base URL",
      detail: hasValue(env.VITE_API_BASE_URL) ? "Server endpoints can be reached by the app." : "Server API URL is not configured.",
      status: hasValue(env.VITE_API_BASE_URL) ? "ready" : "missing",
      owner: "Backend",
      action: "Set VITE_API_BASE_URL."
    },
    {
      id: "bot-identity",
      title: "Telegram bot identity",
      detail: hasValue(env.VITE_TELEGRAM_BOT_USERNAME)
        ? "Bot username is available for user-facing links."
        : "Bot username is not configured for launch links.",
      status: hasValue(env.VITE_TELEGRAM_BOT_USERNAME) ? "ready" : "warning",
      owner: "Telegram Bot",
      action: "Set VITE_TELEGRAM_BOT_USERNAME."
    }
  ];

  const milestones: LaunchMilestone[] = [
    {
      title: "Validate Telegram users",
      detail: "Server verifies initData, maps Telegram ID to role and bureau, then signs Supabase JWT claims.",
      status: "missing"
    },
    {
      title: "Lock database policies",
      detail: "Supabase schema and RLS drafts now exist, but they still need review inside the real project.",
      status: "warning"
    },
    {
      title: "Move photos to storage",
      detail: "Attendance selfies should upload to private storage with signed review URLs, not remain in local state.",
      status: "missing"
    },
    {
      title: "Send real Telegram alerts",
      detail: "Mock notification records become Bot API sends with retry logging and no client-side bot token.",
      status: "missing"
    },
    {
      title: "Run public release rehearsal",
      detail: "Mainboard checks student, committee, Special Task, and emergency flows before the IIUM public link opens.",
      status: "warning"
    }
  ];

  const summary = checks.reduce(
    (counts, check) => {
      counts[check.status] += 1;
      return counts;
    },
    { ready: 0, warning: 0, missing: 0 } as Record<LaunchStatus, number>
  );

  return {
    checks,
    milestones,
    mode,
    mockMode,
    summary,
    canLaunch: summary.missing === 0 && !mockMode
  };
}
