import { useState } from "react";
import { motion } from "framer-motion";
import { Map, BookOpen, CalendarDays, ClipboardCheck, ClipboardList, Grid3X3, HeartPulse, Bell, Rocket, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { MenuTile } from "../components/MenuTile";
import { EventCarousel } from "../components/EventCarousel";
import { bureauShortLabels, roleLabels } from "../constants";
import {
  TransitionReminderBanner,
  RoutePlannerModal,
  useRoutePlanner,
  useScheduleTransition
} from "../features/navigation";
import { getTaweWeekProgress } from "../lib/scheduleTime";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";

type TileTone = "blue" | "green" | "amber" | "red" | "violet";

function Dashboard() {
  const { user } = useMockUser();
  const { announcements, attendanceProofs, bureauOperations, schedule, reports, tasks, notifications, dismissAnnouncement } = useMockData();
  const bureauTasks = user.role === "mainboard" ? tasks : tasks.filter((task) => task.bureau === user.bureau);
  const openReports = reports.filter((report) => report.status !== "resolved").length;
  const completed = tasks.filter((task) => task.status === "done").length;
  const poaCompletion = Math.round((completed / Math.max(tasks.length, 1)) * 100);
  const taweCompletion = getTaweWeekProgress(schedule, new Date());
  const completion = user.role === "student" ? taweCompletion : poaCompletion;
  const pendingAttendance = attendanceProofs.filter((proof) => proof.status === "pending_review").length;
  const opsIssues =
    user.role === "mainboard"
      ? bureauOperations.filter((operation) => operation.status === "issue").length
      : bureauOperations.filter((operation) => operation.bureau === user.bureau && operation.status === "issue").length;

  const transition = useScheduleTransition(schedule);
  const { lookup } = useRoutePlanner();
  const [navReminderDismissed, setNavReminderDismissed] = useState(false);
  const [navModalRoute, setNavModalRoute] = useState<{ fromCode: string; toCode: string } | null>(null);

  const latestUrgent = announcements
    .filter((a) => a.isActive && (a.type === "urgent" || a.type === "emergency") && !a.dismissedBy?.includes(user.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const studentTiles: Array<{ to: string; title: string; meta: string; icon: typeof CalendarDays; tone: TileTone }> = [
    { to: "/resources", title: "Guides", meta: "Booklet, dress code and contacts", icon: BookOpen, tone: "amber" as const },
    { to: "/announcements", title: "News", meta: "Latest announcement", icon: Bell, tone: "blue" as const },
    { to: "/wellbeing", title: "Get Help", meta: "Report health to Welfare committee", icon: HeartPulse, tone: "red" as const },
    { to: "/map", title: "Map", meta: "Interactive IIUM campus map", icon: Map, tone: "green" as const }
  ];

  const committeeTiles: Array<{ to: string; title: string; meta: string; icon: typeof CalendarDays; tone: TileTone }> = [
    { to: "/schedule", title: "Today's Programme", meta: "View live schedule", icon: CalendarDays, tone: "blue" as const },
    { to: "/bureau", title: "Bureau Ops", meta: `${opsIssues} need attention`, icon: Grid3X3, tone: "violet" as const },
    { to: "/tasks", title: "Tasks", meta: `${bureauTasks.length} visible tasks`, icon: ClipboardList, tone: "green" as const },
    { to: "/wellbeing", title: "Get Help", meta: `${openReports} open reports`, icon: HeartPulse, tone: "red" as const }
  ];

  const mainboardTiles: Array<{ to: string; title: string; meta: string; icon: typeof CalendarDays; tone: TileTone }> = [
    { to: "/mainboard", title: "Control Room", meta: `${notifications.length} sends`, icon: ShieldAlert, tone: "violet" as const },
    { to: "/bureau", title: "Bureau Ops", meta: `${opsIssues} issues`, icon: Grid3X3, tone: "green" as const },
    { to: "/launch", title: "Launch Readiness", meta: "Production gate checks", icon: Rocket, tone: "amber" as const },
    { to: "/attendance", title: "Attendance Review", meta: `${pendingAttendance} awaiting`, icon: ClipboardCheck, tone: "red" as const }
  ];

  const tiles = user.role === "student" ? studentTiles : user.role === "mainboard" ? mainboardTiles : committeeTiles;

  return (
    <section className="page-stack">
      {user.role === "student" && !user.matricNumber && (
        <a className="register-bar" href="https://t.me/iiumtaweprobot" target="_blank" rel="noreferrer">
          <span>Complete your registration to track attendance — message @iiumtaweprobot /start</span>
          <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>Register →</span>
        </a>
      )}

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

      <EventCarousel />

      <div className="hero-panel">
        <div>
          <p className="eyebrow">{user.role === "student" ? "Your week at a glance" : `${bureauShortLabels[user.bureau || "Program Coordinator"]} workspace`}</p>
          <h2 style={{ fontFamily: "var(--font-display)" }}>
            {user.role === "student" ? "TAWE Progress" : "POA Completion"}
          </h2>
          <p>{user.role === "student" ? "Track your event attendance and kit eligibility" : "Bureau task completion for today's operations"}</p>
        </div>
        <div className="metric-orbit">
          <ShieldCheck size={20} aria-hidden="true" />
          <strong>{completion}%</strong>
          <span>{user.role === "student" ? "TAWE done" : "POA done"}</span>
        </div>
      </div>

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
