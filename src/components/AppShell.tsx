import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Camera,
  ClipboardList,
  Grid3X3,
  Home,
  Map,
  Megaphone,
  ShieldAlert,
  X,
  UserRound
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { roleLabels } from "../constants";
import { hapticImpact } from "../lib/telegram";
import { applyRoleTheme } from "../lib/themes";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { Role } from "../types";
import { AccessCodeGate } from "./AccessCodeGate";
import { RoleSwitcher } from "./RoleSwitcher";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  roles: Role[];
};

const navItems: NavItem[] = [
  { to: "/", label: "Home", icon: Home, roles: ["student", "committee", "head", "mainboard"] },
  { to: "/schedule", label: "Schedule", icon: CalendarDays, roles: ["student", "committee", "head", "mainboard"] },
  { to: "/announcements", label: "News", icon: Megaphone, roles: ["student", "committee", "head", "mainboard"] },
  { to: "/resources", label: "Resources", icon: BookOpen, roles: ["student", "committee", "head", "mainboard"] },
  { to: "/map", label: "Map", icon: Map, roles: ["student"] },
  { to: "/wellbeing", label: "Wellbeing", icon: Activity, roles: ["student", "committee", "head", "mainboard"] },
  { to: "/tasks", label: "Tasks", icon: ClipboardList, roles: ["committee", "head", "mainboard"] },
  { to: "/attendance", label: "Punch", icon: Camera, roles: ["committee", "head", "mainboard"] },
  { to: "/bureau", label: "Ops", icon: Grid3X3, roles: ["committee", "head", "mainboard"] },
  { to: "/mainboard", label: "Control", icon: ShieldAlert, roles: ["mainboard"] }
];

export function AppShell() {
  const location = useLocation();
  const { user } = useMockUser();
  const { banners, dismissBanner } = useMockData();
  const [accountOpen, setAccountOpen] = useState(false);
  const visibleNav = navItems.filter((item) => item.roles.includes(user.role));
  const activeBanners = banners.filter((banner) => banner.isActive && !banner.dismissedBy?.includes(user.id));

  useEffect(() => {
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    applyRoleTheme(user.role);
  }, [user.role]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <img className="brand-logo" src="/assets/iium-logo.png" alt="" />
          </span>
          <div>
            <p className="eyebrow">Event companion</p>
            <h1>IIUM Ta'aruf Week</h1>
          </div>
        </div>
        <div className="account-menu-wrap">
          <button className="user-pill" type="button" aria-expanded={accountOpen} aria-controls="account-menu" onClick={() => setAccountOpen((value) => !value)}>
            <UserRound size={16} aria-hidden="true" />
            <span>
              {roleLabels[user.role]}
              {user.bureau ? ` - ${user.bureau}` : ""}
            </span>
          </button>
          {accountOpen && (
            <section className="account-popover" id="account-menu" aria-label="Account and access menu">
              <div className="account-popover-head">
                <div>
                  <p className="eyebrow">Current view</p>
                  <strong>
                    {roleLabels[user.role]}
                    {user.bureau ? ` - ${user.bureau}` : ""}
                  </strong>
                </div>
                <button className="icon-button" type="button" aria-label="Close account menu" onClick={() => setAccountOpen(false)}>
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
              {user.role === "student" ? (
                <AccessCodeGate compact />
              ) : (
                <p className="account-note">Committee workspace is active. Use the bottom navigation for your operational sections.</p>
              )}
            </section>
          )}
        </div>
      </header>

      <RoleSwitcher />

      <div className="banner-stack">
        {activeBanners.map((banner) => (
          <div className={`banner banner-${banner.type}`} key={banner.id}>
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>{banner.title}</strong>
              <p>{banner.body}</p>
            </div>
            {banner.type !== "emergency" && (
              <button className="icon-button" onClick={() => dismissBanner(banner.id, user.id)} aria-label="Dismiss banner">
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>

      <main className="main-surface">
        <div className="route-frame" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => hapticImpact("light")}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
