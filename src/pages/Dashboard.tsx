import { motion } from "framer-motion";
import { Map, BookOpen, CalendarDays, ClipboardCheck, ClipboardList, Grid3X3, HeartPulse, Rocket, ShieldAlert } from "lucide-react";
import { MenuTile } from "../components/MenuTile";
import { EventCarousel } from "../components/EventCarousel";
import { StreakWidget } from "../components/StreakWidget";
import { bureauShortLabels } from "../constants";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";

type TileTone = "blue" | "green" | "amber" | "red" | "violet";

function Dashboard() {
  const { user } = useMockUser();
  const { announcements, attendanceProofs, bureauOperations, schedule, reports, tasks, notifications } = useMockData();
  const bureauTasks = user.role === "mainboard" ? tasks : tasks.filter((task) => task.bureau === user.bureau);
  const openReports = reports.filter((report) => report.status !== "resolved").length;
  const pendingAttendance = attendanceProofs.filter((proof) => proof.status === "pending_review").length;
  const opsIssues =
    user.role === "mainboard"
      ? bureauOperations.filter((operation) => operation.status === "issue").length
      : bureauOperations.filter((operation) => operation.bureau === user.bureau && operation.status === "issue").length;

  const studentTiles: Array<{ to: string; title: string; meta: string; icon: typeof CalendarDays; tone: TileTone }> = [
    { to: "/resources", title: "Guides", meta: "Booklet, dress code and contacts", icon: BookOpen, tone: "amber" as const },
    { to: "/announcements", title: "News", meta: "Latest announcement", icon: CalendarDays, tone: "blue" as const },
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

      <EventCarousel />

      <StreakWidget />

      <div className="dashboard-grid">
        {tiles.map((tile, index) => (
          <motion.div key={tile.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
            <MenuTile {...tile} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default Dashboard;
