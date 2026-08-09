import { useEffect } from "react";
import { motion } from "framer-motion";
import { Map, BookOpen, CalendarDays, ClipboardCheck, ClipboardList, Grid3X3, HeartPulse, Rocket, ShieldAlert } from "lucide-react";
import { MenuTile } from "../components/MenuTile";
import { EventCarousel } from "../components/EventCarousel";
import { StreakWidget } from "../components/StreakWidget";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import "../styles/home-midnight-signal.css";

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
    user,
    tiles: user.role === "student" ? studentTiles : user.role === "mainboard" ? mainboardTiles : committeeTiles
  };
}

function Dashboard() {
  const { tiles } = useDashboardModel();
  useEffect(() => {
    document.documentElement.dataset.homeDraft = "midnight-signal";
    return () => { delete document.documentElement.dataset.homeDraft; };
  }, []);

  return (
    <section className="page-stack home-draft signal-home">
      <EventCarousel />

      <motion.div
        className="signal-status"
        initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
        animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="signal-live"><i /> SYSTEM LIVE</span>
        <span>GOMBAK / TW26</span>
        <span>MYT +08</span>
      </motion.div>

      <motion.section
        className="signal-hero"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.65 }}
      >
        <span className="signal-code">ORIENTATION_OS</span>
        <h1>OWN<br />THE <b>WEEK.</b></h1>
        <motion.div
          className="signal-radar"
          animate={{ rotate: 360 }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          aria-hidden="true"
        />
      </motion.section>

      <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.18, type: "spring" }}>
        <StreakWidget />
      </motion.div>

      <div className="signal-label-row">
        <span>QUICK ACCESS</span>
        <span>{String(tiles.length).padStart(2, "0")} MODULES</span>
      </div>

      <div className="dashboard-grid signal-grid">
        {tiles.map((tile, index) => (
          <motion.div
            key={tile.title}
            className="signal-tile-wrap"
            initial={{ opacity: 0, rotateX: -22, y: 22 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            transition={{ delay: 0.25 + index * 0.08, type: "spring", stiffness: 150, damping: 18 }}
          >
            <span className="signal-tile-code">0{index + 1} / SYS</span>
            <MenuTile {...tile} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default Dashboard;
