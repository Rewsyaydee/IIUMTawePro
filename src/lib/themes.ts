import type { Role } from "../types";

export interface RoleTheme {
  primary: string;
  primaryDeep: string;
  accent: string;
  accentSoft: string;
  surface: string;
  muted: string;
}

export const roleThemes: Record<Role, RoleTheme> = {
  student: {
    primary: "#00918e",
    primaryDeep: "#006c69",
    accent: "#d59f0f",
    accentSoft: "#f3e7c8",
    surface: "#f5f8f4",
    muted: "#69756f"
  },
  committee: {
    primary: "#2563eb",
    primaryDeep: "#1d4ed8",
    accent: "#f59e0b",
    accentSoft: "#fef3c7",
    surface: "#f8fafc",
    muted: "#64748b"
  },
  head: {
    primary: "#7c3aed",
    primaryDeep: "#6d28d9",
    accent: "#d59f0f",
    accentSoft: "#ede9fe",
    surface: "#faf5ff",
    muted: "#8b7aa8"
  },
  mainboard: {
    primary: "#0f766e",
    primaryDeep: "#115e59",
    accent: "#ef4444",
    accentSoft: "#fecaca",
    surface: "#f0fdfa",
    muted: "#5e7f7a"
  }
};

export function applyRoleTheme(role: Role) {
  const theme = roleThemes[role];
  const root = document.documentElement;

  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-deep", theme.primaryDeep);
  root.style.setProperty("--gold", theme.accent);
  root.style.setProperty("--gold-soft", theme.accentSoft);
  root.style.setProperty("--tg-link-color", theme.primary);
  root.style.setProperty("--tg-button-color", theme.primary);
  root.setAttribute("data-role", role);
}
