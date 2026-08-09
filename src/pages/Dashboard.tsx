import { useEffect } from "react";
import { motion } from "framer-motion";
import { Map, BookOpen, CalendarDays, ClipboardCheck, ClipboardList, Grid3X3, HeartPulse, Rocket, ShieldAlert } from "lucide-react";
import { MenuTile } from "../components/MenuTile";
import { EventCarousel } from "../components/EventCarousel";
import { StreakWidget } from "../components/StreakWidget";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import "../styles/home-emerald-cream.css";

type TileTone = "blue" | "green" | "amber" | "red" | "violet";
type Tile = { to: string; title: string; meta: string; icon: typeof CalendarDays; tone: TileTone };

function useDashboardModel() {
  const { user } = useMockUser();
  const { attendanceProofs, bureauOperations, reports, tasks, notifications } = useMockData();
  const bureauTasks = user.role === "mainboard" ? tasks : tasks.filter((task) => task.bureau === user.bureau);
  const openReports = reports.filter((report) => report.status !== "resolved").length;
  const pendingAttendance = attendanceProofs.filter((proof) => proof.status === "pending_review").length;
  const opsIssues = user.role === "mainboard"
    ? bureauOperations.filter((operation) => operation.status === "issue").length
    : bureauOperations.filter((operation) => operation.bureau === user.bureau && operation.status === "issue").length;

  const studentTiles: Tile[] = [
    { to: "/resources", title: "Guides", meta: "Booklet, dress code and contacts", icon: BookOpen, tone: "amber" },
    { to: "/announcements", title: "News", meta: "Latest announcement", icon: CalendarDays, tone: "blue" },
    { to: "/wellbeing", title: "Get Help", meta: "Report health to Welfare committee", icon: HeartPulse, tone: "red" },
    { to: "/map", title: "Map", meta: "Interactive IIUM campus map", icon: Map, tone: "green" }
  ];
  const committeeTiles: Tile[] = [
    { to: "/schedule", title: "Today's Programme", meta: "View live schedule", icon: CalendarDays, tone: "blue" },
    { to: "/bureau", title: "Bureau Ops", meta: `${opsIssues} need attention`, icon: Grid3X3, tone: "violet" },
    { to: "/tasks", title: "Tasks", meta: `${bureauTasks.length} visible tasks`, icon: ClipboardList, tone: "green" },
    { to: "/wellbeing", title: "Get Help", meta: `${openReports} open reports`, icon: HeartPulse, tone: "red" }
  ];
  const mainboardTiles: Tile[] = [
    { to: "/mainboard", title: "Control Room", meta: `${notifications.length} sends`, icon: ShieldAlert, tone: "violet" },
    { to: "/bureau", title: "Bureau Ops", meta: `${opsIssues} issues`, icon: Grid3X3, tone: "green" },
    { to: "/launch", title: "Launch Readiness", meta: "Production gate checks", icon: Rocket, tone: "amber" },
    { to: "/attendance", title: "Attendance Review", meta: `${pendingAttendance} awaiting`, icon: ClipboardCheck, tone: "red" }
  ];

  return {
    tiles: user.role === "student" ? studentTiles : user.role === "mainboard" ? mainboardTiles : committeeTiles
  };
}

function Dashboard() {
  const { tiles } = useDashboardModel();

  useEffect(() => {
    document.documentElement.dataset.homeDraft = "emerald-cream";
    return () => { delete document.documentElement.dataset.homeDraft; };
  }, []);

  return (
    <section className="page-stack mobile-home emerald-home">
      <EventCarousel />

      <motion.div
        className="mobile-section-label emerald-label"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span>My Ta’aruf</span>
        <i />
        <span>Progress</span>
      </motion.div>

      <motion.div
        className="mobile-progress-shell"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
      >
        <StreakWidget />
      </motion.div>

      <div className="mobile-shortcut-heading">
        <div>
          <span>Quick access</span>
          <h2>Everything nearby</h2>
        </div>
        <span className="mobile-shortcut-count">{tiles.length}</span>
      </div>

      <motion.div
        className="dashboard-grid emerald-grid"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } } }}
      >
        {tiles.map((tile) => (
          <motion.div
            key={tile.title}
            variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
            transition={{ type: "spring", stiffness: 170, damping: 18 }}
          >
            <MenuTile {...tile} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export default Dashboard;
