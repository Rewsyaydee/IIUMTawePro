import { useEffect, useMemo, useRef } from "react";
import { MapPin, Info, Plane, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getScheduleClock, getScheduleStatus, scheduleDateTime, type ScheduleStatus } from "../lib/scheduleTime";
import { hapticImpact } from "../lib/telegram";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { ScheduleItem } from "../types";

export function EventCarousel() {
  const { user } = useMockUser();
  const { schedule } = useMockData();
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

  const currentIndex = useMemo(() => {
    const liveIdx = sorted.findIndex(
      (item) => getScheduleStatus(item, scheduleClock.now) === "live"
    );
    if (liveIdx >= 0) return liveIdx;

    const upcomingIdx = sorted.findIndex(
      (item) => getScheduleStatus(item, scheduleClock.now) === "upcoming"
    );
    if (upcomingIdx >= 0) return upcomingIdx;

    return sorted.length - 1;
  }, [sorted, scheduleClock.now]);

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

  const handleCheckIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticImpact("medium");
    navigate("/attendance");
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticImpact("medium");
    navigate("/map");
  };

  return (
    <div className="event-carousel-wrapper">
      <div className="event-carousel" ref={scrollerRef}>
        {sorted.map((item, index) => {
          const status: ScheduleStatus = getScheduleStatus(item, scheduleClock.now);
          const isCurrent = index === currentIndex;
          const isPast = status === "done";
          const isLive = status === "live";
          const checkedIn = false;

          return (
            <div
              key={item.id}
              ref={(el) => { cardRefs.current[index] = el; }}
              className={`carousel-card ${isCurrent ? "current" : ""} ${isPast ? "past" : ""}`}
              onClick={handleCardTap}
            >
              {isPast && (
                <span className="carousel-edge-label left">PAST</span>
              )}
              {!isPast && !isCurrent && (
                <span className="carousel-edge-label right">NEXT</span>
              )}

              <div className="carousel-card-top">
                {isLive ? (
                  <span className="carousel-now-badge">NOW</span>
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
              </div>

              {isCurrent && (
                <div className="carousel-card-actions">
                  {user.role === "student" ? (
                    <button
                      className={`carousel-action-btn check-in ${checkedIn ? "checked" : ""}`}
                      type="button"
                      onClick={handleCheckIn}
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
                      onClick={handleCheckIn}
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
