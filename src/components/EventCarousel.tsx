import { useEffect, useMemo, useRef } from "react";
import { MapPin, Info, Plane, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getScheduleClock, getScheduleStatus, scheduleDateTime } from "../lib/scheduleTime";
import { hapticImpact, hapticSuccess } from "../lib/telegram";
import { ColorSweepText } from "./ColorSweepText";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { ScheduleItem } from "../types";

export function EventCarousel() {
  const { user } = useMockUser();
  const { schedule, studentAttendances } = useMockData();
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const scheduleClock = useMemo(() => getScheduleClock(schedule), [schedule]);

  const sorted = useMemo(
    () =>
      [...schedule].sort(
        (a, b) =>
          scheduleDateTime(a.date, a.scheduledStartTime).getTime() -
          scheduleDateTime(b.date, b.scheduledStartTime).getTime()
      ),
    [schedule]
  );

  const liveIndices = useMemo(() => {
    return sorted
      .map((item, i) => ({ item, i, status: getScheduleStatus(item, scheduleClock.now) }))
      .filter((e) => e.status === "live")
      .map((e) => e.i);
  }, [sorted, scheduleClock.now]);

  const firstLiveOrUpcoming = useMemo(() => {
    if (liveIndices.length > 0) return liveIndices[0];
    const upcomingIdx = sorted.findIndex(
      (item) => getScheduleStatus(item, scheduleClock.now) === "upcoming"
    );
    if (upcomingIdx >= 0) return upcomingIdx;
    return sorted.length - 1;
  }, [liveIndices, sorted, scheduleClock.now]);

  useEffect(() => {
    const el = cardRefs.current[firstLiveOrUpcoming];
    if (el && scrollerRef.current) {
      const scroller = scrollerRef.current;
      const elRect = el.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const scrollLeft =
        el.offsetLeft - scroller.offsetLeft - (scrollerRect.width - elRect.width) / 2;
      scroller.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [firstLiveOrUpcoming]);

  const handleCardTap = () => {
    hapticImpact("light");
    navigate("/schedule");
  };

  const handleCheckIn = (e: React.MouseEvent, item: ScheduleItem) => {
    e.stopPropagation();
    hapticSuccess();
    if (item.block && item.blockGroup) {
      const blockLabel = item.block === "before_break" ? "Morning Session" : "Afternoon Session";
      const blockId = `block-${item.blockGroup}-${item.block}`;
      const venueCodes = [item.venueCode].filter(Boolean) as string[];
      navigate("/attendance", { state: { blockLabel, blockId, venueCodes } });
    } else {
      navigate("/attendance");
    }
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticImpact("medium");
    navigate("/map");
  };

  const isBlockAttended = (item: ScheduleItem): boolean => {
    if (!item.block || !item.blockGroup) return false;
    const blockId = `block-${item.blockGroup}-${item.block}`;
    return studentAttendances.some(
      (a) => a.userId === user.id && a.scheduleItemId === blockId && (a.status === "present" || a.status === "excused")
    );
  };

  return (
    <div className="event-carousel-wrapper">
      <div className="event-carousel" ref={scrollerRef}>
        {sorted.map((item, index) => {
          const status = getScheduleStatus(item, scheduleClock.now);
          const isPast = status === "done";
          const isLive = status === "live";
          const isOngoing = Boolean(item.isConcurrent) && isLive;
          const isHighlighted = isLive;
          const checkedIn = isBlockAttended(item);

          return (
            <div
              key={item.id}
              ref={(el) => { cardRefs.current[index] = el; }}
              className={`carousel-card ${isHighlighted ? "current" : ""} ${isPast ? "past" : ""} ${isOngoing ? "ongoing" : ""}`}
              onClick={handleCardTap}
            >
              {isPast && (
                <span className="carousel-edge-label left">PAST</span>
              )}
              {!isPast && !isHighlighted && !isOngoing && (
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
                <p className="carousel-card-time">
                  {item.scheduledStartTime} — {item.scheduledEndTime}
                </p>
                <h3 className="carousel-card-title">{item.title}</h3>
                <div className="carousel-card-venue">
                  <MapPin size={14} />
                  <span>{item.venue}</span>
                </div>
                {item.track && (
                  <p className="carousel-card-sessions">{item.track}</p>
                )}
              </div>

              {isLive && (
                <div className="carousel-card-actions">
                  {user.role === "student" ? (
                    <button
                      className={`carousel-action-btn check-in ${checkedIn ? "checked" : ""}`}
                      type="button"
                      onClick={(e) => handleCheckIn(e, item)}
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
                      onClick={(e) => handleCheckIn(e, item)}
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
