import { useState } from "react";
import { motion } from "framer-motion";
import { Map, BookOpen, CalendarDays, Camera, ClipboardList, FileText, Grid3X3, HeartPulse, Bell, Rocket, ShieldCheck, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { MenuTile } from "../components/MenuTile";
import { StatusBadge } from "../components/StatusBadge";
import { bureauShortLabels, roleLabels } from "../constants";
import {
  TransitionReminderBanner,
  RoutePlannerModal,
  useRoutePlanner,
  useScheduleTransition
} from "../features/navigation";
import { getCurrentScheduleItem, getScheduleClock, getScheduleStatus, getTaweWeekProgress } from "../lib/scheduleTime";
import { getTelegramWebApp } from "../lib/telegram";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";

type TileTone = "blue" | "green" | "amber" | "red" | "violet";

function simplifyTitle(title: string): string {
  const m = title.match(/^Video Presentation with relevant KCDIO:\s*(.+)$/);
  if (m) return `Video Presentation (${m[1]})`;
  return title;
}

function Dashboard() {
  const { user } = useMockUser();
  const { announcements, attendanceProofs, bureauOperations, schedule, reports, tasks, notifications, dismissAnnouncement } = useMockData();
  const scheduleClock = getScheduleClock(schedule);
  const currentScheduleItem = getCurrentScheduleItem(schedule, scheduleClock.now);
  const currentScheduleStatus = currentScheduleItem ? getScheduleStatus(currentScheduleItem, scheduleClock.now) : "upcoming";
  const live = currentScheduleItem && currentScheduleStatus === "live" ? currentScheduleItem : undefined;
  const bureauTasks = user.role === "mainboard" ? tasks : tasks.filter((task) => task.bureau === user.bureau);
  const openReports = reports.filter((report) => report.status !== "resolved").length;
  const completed = tasks.filter((task) => task.status === "done").length;
  const poaCompletion = Math.round((completed / Math.max(tasks.length, 1)) * 100);
  const taweCompletion = getTaweWeekProgress(schedule, scheduleClock.now);
  const completion = user.role === "student" ? taweCompletion : poaCompletion;
  const pendingAttendance = attendanceProofs.filter((proof) => proof.status === "pending_review").length;
  const opsIssues =
    user.role === "mainboard"
      ? bureauOperations.filter((operation) => operation.status === "issue").length
      : bureauOperations.filter((operation) => operation.bureau === user.bureau && operation.status === "issue").length;
  const telegramUser = getTelegramWebApp()?.initDataUnsafe?.user;
  const firstName = telegramUser?.first_name || telegramUser?.username || user.name.split(" ")[0];

  const transition = useScheduleTransition(schedule);
  const { lookup } = useRoutePlanner();
  const [navReminderDismissed, setNavReminderDismissed] = useState(false);
  const [navModalRoute, setNavModalRoute] = useState<{ fromCode: string; toCode: string } | null>(null);

  const latestUrgent = announcements
    .filter((a) => a.isActive && (a.type === "urgent" || a.type === "emergency") && !a.dismissedBy?.includes(user.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const dashboardTitle = user.role === "student" ? `Assalamu'alaikum, ${firstName}` : "Committee command centre";
  const dashboardSubtitle =
    user.role === "student"
      ? "Today's programme, safety contacts, and support in one calm place."
      : `${user.bureau ? bureauShortLabels[user.bureau] : "Mainboard"} workspace for today's operations.`;

  const tiles: Array<{ to: string; title: string; meta: string; icon: typeof CalendarDays; tone: TileTone }> = [
    { to: "/schedule", title: "Today's Programme", meta: live ? `Live: ${simplifyTitle(live.title)}` : currentScheduleItem ? `Next: ${simplifyTitle(currentScheduleItem.title)}` : "No live slot", icon: CalendarDays, tone: "blue" as const },
    { to: "/official-schedule", title: "Official PDF", meta: "IIUM source schedule", icon: FileText, tone: "amber" as const },
    { to: "/attendance", title: "Daily Punch Card", meta: `${pendingAttendance} awaiting review`, icon: Camera, tone: "red" as const },
    { to: "/tasks", title: "Bureau Tasks", meta: `${bureauTasks.length} visible tasks`, icon: ClipboardList, tone: "green" as const },
    { to: "/bureau", title: "Bureau Ops", meta: `${opsIssues} need attention`, icon: Grid3X3, tone: "violet" as const },
    { to: "/resources", title: "Guides & Contacts", meta: "Booklet, dress code, contacts", icon: BookOpen, tone: "amber" as const },
    { to: "/wellbeing", title: "Get Help", meta: `${openReports} open reports`, icon: HeartPulse, tone: "red" as const }
  ].filter((tile) => !["/tasks", "/attendance", "/bureau"].includes(tile.to) || user.role !== "student");

  if (user.role === "student") {
    tiles.push({ to: "/map", title: "Campus Map", meta: "Navigate between venues", icon: Map, tone: "green" as const });
  }

  if (user.role === "mainboard") {
    tiles.push({ to: "/mainboard", title: "Control Room", meta: `${notifications.length} mock sends`, icon: ShieldAlert, tone: "violet" as const });
    tiles.push({ to: "/launch", title: "Launch Readiness", meta: "Production gate checks", icon: Rocket, tone: "amber" as const });
  }

  return (
    <section className="page-stack">
      {latestUrgent && (
        <motion.div
          drag="x"
          dragConstraints={{ left: -200, right: 0 }}
          dragElastic={0.7}
          onDragEnd={(_, info) => {
            if (info.offset.x < -120) dismissAnnouncement(latestUrgent.id, user.id);
          }}
          whileDrag={{ scale: 0.98, transition: { type: "spring", stiffness: 300, damping: 20 } }}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="swipeable-card"
        >
          <div className={latestUrgent.type === "emergency" ? "urgent-banner emergency" : "urgent-banner"}>
            <div className="urgent-banner-content">
              <Bell size={18} />
              <div>
                <strong>{latestUrgent.title}</strong>
                <p>{latestUrgent.body.split("\n")[0]}</p>
              </div>
            </div>
            <div className="urgent-banner-actions">
              <Link className="primary-button" to="/announcements">View all</Link>
              <button className="icon-button" type="button" onClick={(e) => { e.stopPropagation(); dismissAnnouncement(latestUrgent.id, user.id); }} aria-label="Dismiss">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {user.role === "student" && transition && transition.shouldRemind && !navReminderDismissed && (
        <TransitionReminderBanner
          transition={transition}
          onNavigate={() => setNavModalRoute({ fromCode: transition.fromCode, toCode: transition.toCode })}
          onDismiss={() => setNavReminderDismissed(true)}
        />
      )}

      <div className="hero-panel">
        <div>
          <p className="eyebrow">Garden of Knowledge and Virtue</p>
          <h2>{dashboardTitle}</h2>
          <p>{dashboardSubtitle}</p>
        </div>
        <div className="metric-orbit">
          <ShieldCheck size={20} aria-hidden="true" />
          <strong>{completion}%</strong>
          <span>{user.role === "student" ? "TAWE done" : "POA done"}</span>
        </div>
      </div>

      {live && (
        <motion.article className="live-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <StatusBadge value="live" />
            <h3>{simplifyTitle(live.title)}</h3>
            <p>
              {live.scheduledStartTime}-{live.scheduledEndTime} at {live.venue}
            </p>
          </div>
          {live.responsibleBureau && <span className="soft-chip">{live.responsibleBureau}</span>}
        </motion.article>
      )}

      <div className="dashboard-grid">
        {tiles.map((tile, index) => (
          <motion.div key={tile.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
            <MenuTile {...tile} />
          </motion.div>
        ))}
      </div>

      {navModalRoute && (() => {
        const navRoute = lookup(navModalRoute.fromCode, navModalRoute.toCode);
        return navRoute ? <RoutePlannerModal route={navRoute} onClose={() => setNavModalRoute(null)} /> : null;
      })()}
    </section>
  );
}

export default Dashboard;
