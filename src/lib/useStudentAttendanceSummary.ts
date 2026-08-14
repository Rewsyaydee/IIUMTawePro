import { useCallback, useEffect, useMemo, useState } from "react";
import { getRequiredBlockCount } from "../data/eventSchedule";
import { authSessionChangedEvent, shouldUseApiAuth } from "./apiAuth";
import { listStudentAttendance } from "./studentAttendanceApi";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { ScheduleItem, StudentAttendance } from "../types";

// Single source of truth for the student streak / attended-count used by both
// the Dashboard StreakWidget and the Attendance page. API mode reads the same
// RPC the Attendance page uses, so both routes always show identical numbers.
export function useStudentAttendanceSummary(schedule: ScheduleItem[]) {
  const { user } = useMockUser();
  const { studentAttendances } = useMockData();
  const apiMode = shouldUseApiAuth();
  const [attendances, setAttendances] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [authTick, setAuthTick] = useState(0);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const h = () => setAuthTick((v) => v + 1);
    window.addEventListener(authSessionChangedEvent, h);
    return () => window.removeEventListener(authSessionChangedEvent, h);
  }, []);

  useEffect(() => {
    if (!apiMode) {
      setAttendances(studentAttendances.filter((a) => a.userId === user.id));
      return;
    }
    let cancelled = false;
    setLoading(true);
    listStudentAttendance()
      .then((a) => { if (!cancelled) setAttendances(a); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiMode, authTick, reloadTick, studentAttendances, user.id]);

  const totalRequired = getRequiredBlockCount(schedule);
  const attendedCount = useMemo(
    () => attendances.filter((a) => a.status === "present" || a.status === "excused").length,
    [attendances]
  );

  const refresh = useCallback(() => setReloadTick((v) => v + 1), []);

  return {
    attendances,
    attendedCount,
    totalRequired,
    remaining: Math.max(totalRequired - attendedCount, 0),
    loading,
    refresh
  };
}
