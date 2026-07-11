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
    primary: "#E5D3B3",
    primaryDeep: "#c9b896",
    accent: "#E5D3B3",
    accentSoft: "rgba(229, 211, 179, 0.15)",
    surface: "rgba(255, 255, 255, 0.07)",
    muted: "rgba(255, 255, 255, 0.65)"
  },
  committee: {
    primary: "#5b9eb8",
    primaryDeep: "#4a8a9e",
    accent: "#E5D3B3",
    accentSoft: "rgba(229, 211, 179, 0.15)",
    surface: "rgba(255, 255, 255, 0.07)",
    muted: "rgba(255, 255, 255, 0.65)"
  },
  head: {
    primary: "#9b8ac9",
    primaryDeep: "#8475b5",
    accent: "#E5D3B3",
    accentSoft: "rgba(229, 211, 179, 0.15)",
    surface: "rgba(255, 255, 255, 0.07)",
    muted: "rgba(255, 255, 255, 0.65)"
  },
  mainboard: {
    primary: "#ff6b6b",
    primaryDeep: "#e55555",
    accent: "#E5D3B3",
    accentSoft: "rgba(229, 211, 179, 0.15)",
    surface: "rgba(255, 255, 255, 0.07)",
    muted: "rgba(255, 255, 255, 0.65)"
  }
};

export function applyRoleTheme(role: Role) {
  const theme = roleThemes[role];
  const root = document.documentElement;

  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-deep", theme.primaryDeep);
  root.style.setProperty("--gold", theme.accent);
  root.style.setProperty("--gold-soft", theme.accentSoft);
  root.style.setProperty("--gold-accent", theme.accent);
  root.style.setProperty("--role-accent", theme.primary);
  root.style.setProperty("--tg-link-color", theme.primary);
  root.style.setProperty("--tg-button-color", theme.primary);
  root.setAttribute("data-role", role);
}
