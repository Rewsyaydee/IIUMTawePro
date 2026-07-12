import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Grid3X3,
  Home,
  Map,
  Megaphone,
  ShieldAlert,
  Rocket,
  X,
  CheckSquare,
  Heart
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { roleLabels } from "../constants";
import { hapticImpact } from "../lib/telegram";
import { applyRoleTheme } from "../lib/themes";
import { getTelegramWebApp } from "../lib/telegram";
import { useMockUser } from "../state/MockUserContext";
import type { Role } from "../types";
import { AccessCodeGate } from "./AccessCodeGate";
import { RoleSwitcher } from "./RoleSwitcher";

type CenterMenuItem = {
  to: string;
  label: string;
  icon: typeof Home;
};

const centerMenuByRole: Record<Role, CenterMenuItem[]> = {
  student: [
    { to: "/map", label: "Map", icon: Map },
    { to: "/resources", label: "Guides", icon: BookOpen },
    { to: "/announcements", label: "News", icon: Megaphone }
  ],
  committee: [
    { to: "/tasks", label: "Tasks", icon: ClipboardList },
    { to: "/bureau", label: "Ops", icon: Grid3X3 },
    { to: "/map", label: "Map", icon: Map },
    { to: "/resources", label: "Guides", icon: BookOpen },
    { to: "/announcements", label: "News", icon: Megaphone }
  ],
  head: [
    { to: "/tasks", label: "Tasks", icon: ClipboardList },
    { to: "/bureau", label: "Ops", icon: Grid3X3 },
    { to: "/map", label: "Map", icon: Map },
    { to: "/resources", label: "Guides", icon: BookOpen },
    { to: "/announcements", label: "News", icon: Megaphone }
  ],
  mainboard: [
    { to: "/mainboard", label: "Control", icon: ShieldAlert },
    { to: "/launch", label: "Launch", icon: Rocket },
    { to: "/tasks", label: "Tasks", icon: ClipboardList },
    { to: "/bureau", label: "Ops", icon: Grid3X3 },
    { to: "/map", label: "Map", icon: Map },
    { to: "/resources", label: "Guides", icon: BookOpen },
    { to: "/announcements", label: "News", icon: Megaphone }
  ]
};

const bottomNavItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/attendance", label: "Attend", icon: CheckSquare },
  { to: "/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/wellbeing", label: "Help", icon: Heart }
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useMockUser();
  const [accountOpen, setAccountOpen] = useState(false);
  const [centerMenuOpen, setCenterMenuOpen] = useState(false);

  const telegramUser = getTelegramWebApp()?.initDataUnsafe?.user;
  const firstName = telegramUser?.first_name || telegramUser?.username || user.name.split(" ")[0];
  const avatarUrl = telegramUser?.photo_url;
  const initials = firstName.charAt(0).toUpperCase();
  const roleLabel = user.bureau ? `${roleLabels[user.role]} — ${user.bureau}` : roleLabels[user.role];
  const centerMenu = centerMenuByRole[user.role] || [];

  useEffect(() => {
    setAccountOpen(false);
    setCenterMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    applyRoleTheme(user.role);
  }, [user.role]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-mark">
          <img src="/assets/iium-logo.png" alt="" />
          <span>Ta'aruf Week</span>
        </div>
        <div className="app-header-row">
          <div className="app-header-left">
            <h2 className="app-header-greeting">Salam, {firstName}</h2>
          </div>
          <div className="app-header-right">
            <div className="account-menu-wrap">
              {avatarUrl ? (
                <img
                  className="app-header-avatar"
                  src={avatarUrl}
                  alt="Profile"
                  onClick={() => setAccountOpen((v) => !v)}
                />
              ) : (
                <button
                  className="app-header-avatar-fallback"
                  type="button"
                  aria-expanded={accountOpen}
                  aria-controls="account-menu"
                  onClick={() => setAccountOpen((v) => !v)}
                >
                  {initials}
                </button>
              )}
              <span className="app-header-role">{roleLabel}</span>
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
                {user.role === "student" && (
                  <>
                    {user.matricNumber ? (
                      <div className="account-profile">
                        <div className="account-profile-row">
                          <span>Matric</span>
                          <strong>{user.matricNumber}</strong>
                        </div>
                        {user.kulliyyah && (
                          <div className="account-profile-row">
                            <span>Kulliyyah</span>
                            <strong>{user.kulliyyah}</strong>
                          </div>
                        )}
                      </div>
                    ) : (
                      <a className="account-register-link" href="https://t.me/iiumtaweprobot" target="_blank" rel="noreferrer">
                        Register via @iiumtaweprobot /start →
                      </a>
                    )}
                    <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid var(--glass-border)" }} />
                  </>
                )}
                {user.role === "student" ? (
                  <AccessCodeGate compact />
                ) : (
                  <p className="account-note">Committee workspace is active. Use the center menu for your operational sections.</p>
                )}
              </section>
            )}
            </div>
          </div>
        </div>
      </header>

      <RoleSwitcher />

      <main className="main-surface">
        <div className="route-frame" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {bottomNavItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => hapticImpact("light")}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <Icon size={22} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <button
          className="nav-center"
          type="button"
          aria-label="Open menu"
          onClick={() => {
            hapticImpact("medium");
            setCenterMenuOpen(true);
          }}
        >
          <img src="/assets/iium-logo.png" alt="IIUM" />
        </button>

        {bottomNavItems.slice(2).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => hapticImpact("light")}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <Icon size={22} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <AnimatePresence>
        {centerMenuOpen && (
          <>
            <motion.div
              className="center-menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setCenterMenuOpen(false)}
            />
            <motion.div
              className="center-menu-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
            >
              <div className="center-menu-handle" />
              <div className="center-menu-grid">
                {centerMenu.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.to}
                      className="center-menu-item"
                      type="button"
                      onClick={() => {
                        hapticImpact("light");
                        setCenterMenuOpen(false);
                        navigate(item.to);
                      }}
                    >
                      <span className="center-menu-icon">
                        <Icon size={24} aria-hidden="true" />
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
