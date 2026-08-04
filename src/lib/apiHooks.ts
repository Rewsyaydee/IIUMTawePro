import { useEffect, useState } from "react";
import { useDeviceCache } from "./deviceCache";
import { authSessionChangedEvent } from "./apiAuth";
import { listSchedule } from "./scheduleApi";
import { listTasks } from "./tasksApi";
import { listAnnouncements } from "./announcementsApi";
import { listBureauOperations } from "./bureauOpsApi";
import { listStudentAttendance } from "./studentAttendanceApi";
import type { ScheduleItem } from "../types";

export function useScheduleCache() {
  return useDeviceCache("schedule_list", listSchedule, 30 * 60 * 1000);
}

export function useApiSchedule(enabled: boolean): { items: ScheduleItem[]; loading: boolean } {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [authTick, setAuthTick] = useState(0);

  useEffect(() => {
    const handleSessionChanged = () => setAuthTick((v) => v + 1);
    window.addEventListener(authSessionChangedEvent, handleSessionChanged);
    return () => window.removeEventListener(authSessionChangedEvent, handleSessionChanged);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    listSchedule()
      .then((loaded) => {
        if (!cancelled) setItems(loaded);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [enabled, authTick]);

  return { items, loading };
}

export function useTasksCache() {
  return useDeviceCache("tasks_list", listTasks, 15 * 60 * 1000);
}

export function useAnnouncementsCache() {
  return useDeviceCache("announcements_list", listAnnouncements, 15 * 60 * 1000);
}

export function useBureauOpsCache() {
  return useDeviceCache("bureau_ops_list", listBureauOperations, 5 * 60 * 1000);
}

export function useStudentAttendanceCache() {
  return useDeviceCache("student_attendance_list", listStudentAttendance, 10 * 60 * 1000);
}
