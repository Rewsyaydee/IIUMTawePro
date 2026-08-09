import { useEffect } from "react";
import { motion } from "framer-motion";
import { Map, BookOpen, CalendarDays, ClipboardCheck, ClipboardList, Grid3X3, HeartPulse, Rocket, ShieldAlert } from "lucide-react";
import { MenuTile } from "../components/MenuTile";
import { EventCarousel } from "../components/EventCarousel";
import { StreakWidget } from "../components/StreakWidget";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import "../styles/home-earthy-botanicals.css";

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
    document.documentElement.dataset.homeDraft = "earthy-botanicals";
    return () => { delete document.documentElement.dataset.homeDraft; };
  }, []);

  return (
    <section className="page-stack mobile-home earth-home">
      <EventCarousel />

      <motion.div
        className="earth-progress-card"
        initial={{ opacity: 0, y: 14, rotate: -1 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 18 }}
      >
        <span className="earth-leaf earth-leaf-one" aria-hidden="true" />
        <span className="earth-leaf earth-leaf-two" aria-hidden="true" />
        <StreakWidget />
      </motion.div>

      <div className="earth-heading">
        <div>
          <span>Rooted in your week</span>
          <h2>Where do you want to go?</h2>
        </div>
        <span className="earth-sun" aria-hidden="true" />
      </div>

      <motion.div
        className="earth-shortcuts"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      >
        {tiles.map((tile, index) => (
          <motion.div
            key={tile.title}
            className={`earth-shortcut earth-shortcut-${index + 1}`}
            variants={{ hidden: { opacity: 0, x: index % 2 ? 18 : -18 }, show: { opacity: 1, x: 0 } }}
            transition={{ type: "spring", stiffness: 170, damping: 19 }}
          >
            <span className="earth-number">0{index + 1}</span>
            <MenuTile {...tile} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export default Dashboard;
