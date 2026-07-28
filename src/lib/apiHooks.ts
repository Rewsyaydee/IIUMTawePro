import { useDeviceCache } from "./deviceCache";
import { listSchedule } from "./scheduleApi";
import { listTasks } from "./tasksApi";
import { listAnnouncements } from "./announcementsApi";
import { listBureauOperations } from "./bureauOpsApi";
import { listStudentAttendance } from "./studentAttendanceApi";

export function useScheduleCache() {
  return useDeviceCache("schedule_list", listSchedule, 30 * 60 * 1000);
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
