import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { LoadingScreen } from "./components/LoadingScreen";
import { setupTelegramShell } from "./lib/telegram";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Resources = lazy(() => import("./pages/Resources"));
const Wellbeing = lazy(() => import("./pages/Wellbeing"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Attendance = lazy(() => import("./pages/Attendance"));
const BureauOps = lazy(() => import("./pages/BureauOps"));
const Mainboard = lazy(() => import("./pages/Mainboard"));
const LaunchReadiness = lazy(() => import("./pages/LaunchReadiness"));
const OfficialSchedulePdf = lazy(() => import("./pages/OfficialSchedulePdf"));
const Announcements = lazy(() => import("./pages/Announcements"));
const CampusMap = lazy(() => import("./features/navigation/components/CampusMapPage"));

function App() {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    setupTelegramShell();
    const timer = window.setTimeout(() => setBooting(false), 950);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      {booting && <LoadingScreen />}
      <Routes>
        <Route element={<AppShell />}>
          <Route
            index
            element={
              <Suspense fallback={<LoadingScreen compact />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="schedule"
            element={
              <Suspense fallback={<LoadingScreen compact />}>
                <Schedule />
              </Suspense>
            }
          />
          <Route
            path="official-schedule"
            element={
              <Suspense fallback={<LoadingScreen compact />}>
                <OfficialSchedulePdf />
              </Suspense>
            }
          />
          <Route
            path="announcements"
            element={
              <Suspense fallback={<LoadingScreen compact />}>
                <Announcements />
              </Suspense>
            }
          />
          <Route
            path="map"
            element={
              <Suspense fallback={<LoadingScreen compact />}>
                <CampusMap />
              </Suspense>
            }
          />
          <Route
            path="resources"
            element={
              <Suspense fallback={<LoadingScreen compact />}>
                <Resources />
              </Suspense>
            }
          />
          <Route
            path="wellbeing"
            element={
              <Suspense fallback={<LoadingScreen compact />}>
                <Wellbeing />
              </Suspense>
            }
          />
          <Route
            path="tasks"
            element={
              <Suspense fallback={<LoadingScreen compact />}>
                <Tasks />
              </Suspense>
            }
          />
          <Route
            path="attendance"
            element={
              <Suspense fallback={<LoadingScreen compact />}>
                <Attendance />
              </Suspense>
            }
          />
          <Route
            path="bureau"
            element={
              <Suspense fallback={<LoadingScreen compact />}>
                <BureauOps />
              </Suspense>
            }
          />
          <Route
            path="mainboard"
            element={
              <Suspense fallback={<LoadingScreen compact />}>
                <Mainboard />
              </Suspense>
            }
          />
          <Route
            path="launch"
            element={
              <Suspense fallback={<LoadingScreen compact />}>
                <LaunchReadiness />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
