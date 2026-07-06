import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock3, Search } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
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

  const tags = useMemo(() => ["all", ...Array.from(new Set(schedule.map((item) => item.tag)))], [schedule]);
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
  const canUpdateReadiness = user.role === "head" || user.role === "mainboard";

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Programme</p>
          <h2>Event Schedule</h2>
        </div>
        <span className="soft-chip">Polls every 30s later</span>
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
            {items.map((item, index) => (
              <motion.article
                key={item.id}
                className={`schedule-card ${item.isLive ? "is-live" : ""}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.035 }}
              >
                <div className="time-block">
                  <Clock3 size={16} aria-hidden="true" />
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
                      {item.isLive && <StatusBadge value="live" />}
                      <span className="soft-chip">{item.tag}</span>
                    </div>
                  </div>
                  {item.description && <p className="muted">{item.description}</p>}
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
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export default Schedule;
