import { shouldUseApiAuth } from "./apiAuth";
import { useApiSchedule } from "./apiHooks";
import { useMockData } from "../state/MockDataContext";

// Schedule source of truth for attendance/streak UI: in API mode the real rows
// come from the server (so mainboard schedule edits propagate), in mock mode the
// compiled demo schedule is used.
export function useActiveSchedule() {
  const { schedule: mockSchedule } = useMockData();
  const apiMode = shouldUseApiAuth();
  const api = useApiSchedule(apiMode);
  return {
    schedule: apiMode ? api.items : mockSchedule,
    loading: apiMode ? api.loading : false,
    apiMode
  };
}
