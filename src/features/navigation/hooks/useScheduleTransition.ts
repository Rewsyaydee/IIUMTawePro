import { useMemo } from "react";
import type { ScheduleItem } from "../../../types";
import { getCurrentScheduleItem, getScheduleClock } from "../../../lib/scheduleTime";

export interface Transition {
  fromItem: ScheduleItem;
  toItem: ScheduleItem;
  fromCode: string;
  toCode: string;
  needsNavigation: boolean;
  timeUntilTransition: number;
  shouldRemind: boolean;
}

export function useScheduleTransition(schedule: ScheduleItem[]) {
  const clock = useMemo(() => getScheduleClock(schedule), [schedule]);
  const sorted = useMemo(
    () =>
      [...schedule].sort((a, b) =>
        `${a.date}${a.scheduledStartTime}`.localeCompare(`${b.date}${b.scheduledStartTime}`)
      ),
    [schedule]
  );

  const currentItem = useMemo(
    () => getCurrentScheduleItem(sorted, clock.now),
    [clock.now, sorted]
  );

  const transition: Transition | null = useMemo(() => {
    if (!currentItem) return null;

    const currentIdx = sorted.findIndex((item) => item.id === currentItem.id);
    const nextItem = sorted[currentIdx + 1];
    if (!nextItem) return null;

    const fromCode = currentItem.venueCode;
    const toCode = nextItem.venueCode;
    if (!fromCode || !toCode) return null;
    if (fromCode === toCode) return null;

    const [endH, endM] = currentItem.scheduledEndTime.split(":").map(Number);
    const endMinutes = endH * 60 + endM;
    const nowHours = clock.now.getHours();
    const nowMinutes = clock.now.getMinutes();
    const nowTotal = nowHours * 60 + nowMinutes;
    const timeUntil = endMinutes - nowTotal;

    return {
      fromItem: currentItem,
      toItem: nextItem,
      fromCode,
      toCode,
      needsNavigation: true,
      timeUntilTransition: timeUntil,
      shouldRemind: timeUntil > 0 && timeUntil <= 15
    };
  }, [currentItem, sorted, clock.now]);

  return transition;
}
