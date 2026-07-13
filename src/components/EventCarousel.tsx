import { useEffect, useMemo, useRef } from "react";
import { MapPin, Info, Plane, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getScheduleClock, getScheduleStatus, scheduleDateTime } from "../lib/scheduleTime";
import { hapticImpact, hapticSuccess } from "../lib/telegram";
import { ColorSweepText } from "./ColorSweepText";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import {
  getSessionBlocks,
  getConcurrentEvents,
  type SessionBlockInfo
} from "../data/eventSchedule";
import type { ScheduleItem } from "../types";

type CarouselEntry =
  | { kind: "block"; block: SessionBlockInfo; status: "live" | "done" | "upcoming" }
  | { kind: "concurrent"; item: ScheduleItem; status: "live" | "done" | "upcoming" };

export function EventCarousel() {
  const { user } = useMockUser();
  const { schedule, studentAttendances } = useMockData();
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const scheduleClock = useMemo(() => getScheduleClock(schedule), [schedule]);

  const blocks = useMemo(() => getSessionBlocks(schedule), [schedule]);
  const concurrents = useMemo(() => getConcurrentEvents(schedule), [schedule]);

  const entries = useMemo<CarouselEntry[]>(() => {
    const blockEntries: CarouselEntry[] = blocks.map((block) => {
      const blockStart = scheduleDateTime(block.date, block.timeRange.split(" - ")[0]).getTime();
      const blockEnd = scheduleDateTime(block.date, block.timeRange.split(" - ")[1]).getTime();
      const now = scheduleClock.now.getTime();
      const status = now >= blockStart && now < blockEnd ? "live" : now >= blockEnd ? "done" : "upcoming";
      return { kind: "block" as const, block, status };
    });

    const concurrentEntries: CarouselEntry[] = concurrents.map((item) => {
      const status = getScheduleStatus(item, scheduleClock.now);
      return { kind: "concurrent" as const, item, status };
    });

    return [...blockEntries, ...concurrentEntries].sort((a, b) => {
      const aDate = a.kind === "block" ? a.block.date : a.item.date;
      const bDate = b.kind === "block" ? b.block.date : b.item.date;
      const aTime = a.kind === "block" ? a.block.timeRange.split(" - ")[0] : a.item.scheduledStartTime;
      const bTime = b.kind === "block" ? b.block.timeRange.split(" - ")[0] : b.item.scheduledStartTime;
      return `${aDate}${aTime}`.localeCompare(`${bDate}${bTime}`);
    });
  }, [blocks, concurrents, scheduleClock.now]);

  const currentIndex = useMemo(() => {
    const liveIdx = entries.findIndex((e) => e.status === "live" && e.kind === "block");
    if (liveIdx >= 0) return liveIdx;

    const upcomingIdx = entries.findIndex((e) => e.status === "upcoming" && e.kind === "block");
    if (upcomingIdx >= 0) return upcomingIdx;

    return entries.length - 1;
  }, [entries]);

  useEffect(() => {
    const el = cardRefs.current[currentIndex];
    if (el && scrollerRef.current) {
      const scroller = scrollerRef.current;
      const elRect = el.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const scrollLeft =
        el.offsetLeft - scroller.offsetLeft - (scrollerRect.width - elRect.width) / 2;
      scroller.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [currentIndex]);

  const handleCardTap = () => {
    hapticImpact("light");
    navigate("/schedule");
  };

  const handleCheckIn = (e: React.MouseEvent, entry: CarouselEntry) => {
    e.stopPropagation();
    hapticSuccess();
    if (entry.kind === "block") {
      const venueCodes = [...new Set(entry.block.items.map((i) => i.venueCode).filter(Boolean))] as string[];
      const blockLabel = entry.block.blockLabel.includes("Before") ? "Morning Session" : "Afternoon Session";
      navigate("/attendance", { state: { blockLabel, blockId: entry.block.id, venueCodes } });
    } else {
      navigate("/attendance");
    }
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticImpact("medium");
    navigate("/map");
  };

  const isBlockAttended = (blockId: string): boolean => {
    return studentAttendances.some(
      (a) => a.userId === user.id && a.scheduleItemId === blockId && (a.status === "present" || a.status === "excused")
    );
  };

  return (
    <div className="event-carousel-wrapper">
      <div className="event-carousel" ref={scrollerRef}>
        {entries.map((entry, index) => {
          const isCurrent = index === currentIndex;
          const isPast = entry.status === "done";
          const isLive = entry.status === "live";
          const isOngoing = entry.kind === "concurrent" && isLive;

          const title = entry.kind === "block" ? entry.block.blockLabel : entry.item.title;
          const timeRange = entry.kind === "block" ? entry.block.timeRange : `${entry.item.scheduledStartTime} — ${entry.item.scheduledEndTime}`;
          const venue = entry.kind === "block"
            ? [...new Set(entry.block.items.map((i) => i.venue))].join(", ")
            : entry.item.venue;

          const checkedIn = entry.kind === "block" ? isBlockAttended(entry.block.id) : false;

          return (
            <div
              key={entry.kind === "block" ? entry.block.id : entry.item.id}
              ref={(el) => { cardRefs.current[index] = el; }}
              className={`carousel-card ${isCurrent ? "current" : ""} ${isPast ? "past" : ""} ${isOngoing ? "ongoing" : ""}`}
              onClick={handleCardTap}
            >
              {isPast && (
                <span className="carousel-edge-label left">PAST</span>
              )}
              {!isPast && !isCurrent && !isOngoing && (
                <span className="carousel-edge-label right">NEXT</span>
              )}

              <div className="carousel-card-top">
                {isOngoing ? (
                  <span className="carousel-ongoing-badge">ONGOING</span>
                ) : isLive ? (
                  <span className="carousel-now-badge"><ColorSweepText text="NOW" /></span>
                ) : isPast ? (
                  <span className="carousel-status-badge done">Done</span>
                ) : (
                  <span className="carousel-status-badge upcoming">Upcoming</span>
                )}
                <button
                  className="carousel-info-btn"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    hapticImpact("light");
                  }}
                  aria-label="Event info"
                >
                  <Info size={16} />
                </button>
              </div>

              <div className="carousel-card-body">
                <p className="carousel-card-time">{timeRange}</p>
                <h3 className="carousel-card-title">{title}</h3>
                <div className="carousel-card-venue">
                  <MapPin size={14} />
                  <span>{venue}</span>
                </div>
                {entry.kind === "block" && (
                  <p className="carousel-card-sessions">
                    {entry.block.items.length} sessions
                  </p>
                )}
              </div>

              {isCurrent && entry.kind === "block" && (
                <div className="carousel-card-actions">
                  {user.role === "student" ? (
                    <button
                      className={`carousel-action-btn check-in ${checkedIn ? "checked" : ""}`}
                      type="button"
                      onClick={(e) => handleCheckIn(e, entry)}
                    >
                      {checkedIn ? (
                        <>
                          <CheckCircle2 size={15} />
                          Check in ✓
                        </>
                      ) : (
                        "Check in?"
                      )}
                    </button>
                  ) : (
                    <button
                      className="carousel-action-btn stats"
                      type="button"
                      onClick={(e) => handleCheckIn(e, entry)}
                    >
                      Attendance
                    </button>
                  )}
                  <button
                    className="carousel-action-btn navigate"
                    type="button"
                    onClick={handleNavigate}
                  >
                    <Plane size={14} />
                    navigate
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
