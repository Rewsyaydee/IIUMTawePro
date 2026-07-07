import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock3, Search } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { NavigateButton, RoutePlannerModal, useRoutePlanner } from "../features/navigation";
import { formatScheduleClock, getCurrentScheduleItem, getItemProgress, getScheduleClock, getScheduleStatus } from "../lib/scheduleTime";
import { hapticImpact } from "../lib/telegram";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { ReadinessStatus, ScheduleItem, Week } from "../types";

const readiness: ReadinessStatus[] = ["pending", "ready", "issues"];

function groupByDate(items: ScheduleItem[]) {
  return items.reduce<Record<string, ScheduleItem[]>>((groups, item) => {
    groups[item.date] = groups[item.date] || [];
    groups[item.date].push(item);
    return groups;
  }, {});
}

function Schedule() {
  const { user } = useMockUser();
  const { schedule, updateReadiness } = useMockData();
  const [week, setWeek] = useState<Week | "all">("all");
  const [tag, setTag] = useState("all");
  const [query, setQuery] = useState("");
  const [clockTick, setClockTick] = useState(0);
  const [activeRoute, setActiveRoute] = useState<{ fromCode: string; toCode: string } | null>(null);
  const { lookup } = useRoutePlanner();

  const tags = useMemo(() => ["all", ...Array.from(new Set(schedule.map((item) => item.tag)))], [schedule]);
  const scheduleClock = useMemo(() => getScheduleClock(schedule), [clockTick, schedule]);
  const visibleItems = useMemo(() => {
    return schedule
      .filter((item) => week === "all" || item.week === week)
      .filter((item) => tag === "all" || item.tag === tag)
      .filter((item) => {
        const value = `${item.title} ${item.venue} ${item.description || ""}`.toLowerCase();
        return value.includes(query.toLowerCase());
      })
      .sort((a, b) => `${a.date}${a.scheduledStartTime}`.localeCompare(`${b.date}${b.scheduledStartTime}`));
  }, [query, schedule, tag, week]);

  const grouped = groupByDate(visibleItems);
  const currentItem = useMemo(() => getCurrentScheduleItem(visibleItems, scheduleClock.now), [scheduleClock.now, visibleItems]);
  const canUpdateReadiness = user.role === "head" || user.role === "mainboard";

  const isStudent = user.role === "student";

  const getNextItem = useCallback(
    (currentId: string): ScheduleItem | undefined => {
      const sorted = [...schedule].sort((a, b) => `${a.date}${a.scheduledStartTime}`.localeCompare(`${b.date}${b.scheduledStartTime}`));
      const idx = sorted.findIndex((i) => i.id === currentId);
      return idx >= 0 ? sorted[idx + 1] : undefined;
    },
    [schedule]
  );

  const route = activeRoute ? lookup(activeRoute.fromCode, activeRoute.toCode) : undefined;

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentItem) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`schedule-${currentItem.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [currentItem?.id]);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Programme</p>
          <h2>Event Schedule</h2>
        </div>
        <span className="soft-chip">{scheduleClock.isDemo ? `Preview ${formatScheduleClock(scheduleClock.now)}` : `Live ${formatScheduleClock(scheduleClock.now)}`}</span>
      </div>

      <div className="filter-bar">
        <label className="search-box">
          <Search size={16} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search programme" />
        </label>
        <select value={week} onChange={(event) => setWeek(event.target.value as Week | "all")}>
          <option value="all">All weeks</option>
          <option value="preparation">Preparation</option>
          <option value="event_week">Event week</option>
        </select>
        <select value={tag} onChange={(event) => setTag(event.target.value)}>
          {tags.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "All tags" : item}
            </option>
          ))}
        </select>
      </div>

      <div className="timeline">
        {Object.entries(grouped).map(([date, items]) => (
          <div className="timeline-day" key={date}>
            <h3>{date}</h3>
            {items.map((item, index) => {
              const scheduleStatus = getScheduleStatus(item, scheduleClock.now);
              const isLive = scheduleStatus === "live" || item.isLive;
              const isCurrent = currentItem?.id === item.id;
              const progress = getItemProgress(item, scheduleClock.now);

              return (
                <motion.article
                  id={`schedule-${item.id}`}
                  key={item.id}
                  className={`schedule-card schedule-${scheduleStatus} ${isLive ? "is-live" : ""} ${isCurrent ? "is-current" : ""}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                >
                  <div className="time-block">
                    {scheduleStatus === "done" ? <CheckCircle2 className="done-check" size={17} aria-hidden="true" /> : <Clock3 size={16} aria-hidden="true" />}
                    <strong>{item.scheduledStartTime}</strong>
                    <span>{item.scheduledEndTime}</span>
                  </div>
                  <div className="schedule-body">
                    <div className="schedule-title-row">
                      <div>
                        <h4>{item.title}</h4>
                        <p>
                          {item.venue} - {item.audience}
                        </p>
                      </div>
                      <div className="badge-row">
                        {isLive && <StatusBadge value="live" />}
                        {scheduleStatus === "done" && <StatusBadge value="done" />}
                        {isCurrent && !isLive && <StatusBadge value="upcoming" />}
                        <span className="soft-chip">{item.tag}</span>
                      </div>
                    </div>
                    {isLive && (
                      <div className="schedule-progress" aria-label={`${progress}% of this session completed`}>
                        <span style={{ width: `${progress}%` }} />
                      </div>
                    )}
                    {item.description && <p className="muted">{item.description}</p>}
                    {isStudent && (() => {
                      const nextItem = getNextItem(item.id);
                      if (nextItem && item.venueCode && nextItem.venueCode && item.venueCode !== nextItem.venueCode) {
                        const navRoute = lookup(item.venueCode, nextItem.venueCode);
                        if (navRoute) {
                          return (
                            <div style={{ marginTop: "10px" }}>
                              <NavigateButton onClick={() => setActiveRoute({ fromCode: item.venueCode!, toCode: nextItem.venueCode! })} />
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                    {user.role !== "student" && item.responsibleBureau && (
                      <div className="committee-panel">
                        <div>
                          <span className="label">Owner</span>
                          <strong>{item.responsibleBureau}</strong>
                        </div>
                        <div>
                          <span className="label">Readiness</span>
                          {canUpdateReadiness ? (
                            <select
                              value={item.readinessStatus}
                              onChange={(event) => {
                                hapticImpact("light");
                                updateReadiness(item.id, event.target.value as ReadinessStatus);
                              }}
                            >
                              {readiness.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <StatusBadge value={item.readinessStatus || "pending"} />
                          )}
                        </div>
                        <ul className="task-list-mini">
                          {(item.preSessionTasks || []).map((task) => (
                            <li key={task}>
                              <CheckCircle2 size={14} aria-hidden="true" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        ))}
      </div>

      {route && (
        <RoutePlannerModal route={route} onClose={() => setActiveRoute(null)} />
      )}
    </section>
  );
}

export default Schedule;
