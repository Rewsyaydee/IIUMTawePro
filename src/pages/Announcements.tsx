import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, Megaphone, X, AlertTriangle, Bell } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";

function formatRelativeTime(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString("en-MY", { month: "short", day: "numeric" });
}

function Announcements() {
  const { user } = useMockUser();
  const { announcements, dismissAnnouncement, deactivateAnnouncement } = useMockData();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const active = announcements.filter((a) => a.isActive && !a.dismissedBy?.includes(user.id));
  const sorted = [...active].sort((a, b) => {
    if (a.type === "emergency" && b.type !== "emergency") return -1;
    if (b.type === "emergency" && a.type !== "emergency") return 1;
    if (a.type === "urgent" && b.type === "info") return -1;
    if (b.type === "urgent" && a.type === "info") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const isMainboard = user.role === "mainboard";

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Updates</p>
          <h2>Announcements</h2>
        </div>
        <span className="soft-chip">{active.length} active</span>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Bell} title="No announcements" body="Important updates from the committee will appear here." />
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          {sorted.map((announcement) => {
            const isExpanded = announcement.type === "emergency" || expandedId === announcement.id;

            return (
              <motion.div
                key={announcement.id}
                drag={announcement.type !== "emergency" ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.08}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -70) dismissAnnouncement(announcement.id, user.id);
                }}
                whileDrag={{ scale: 0.98 }}
                className="swipeable-card"
              >
                {announcement.type !== "emergency" && (
                  <div className="swipe-delete-bg">
                    <svg className="swipeable-delete-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                  </div>
                )}
                <article
                  className={`announcement-card${announcement.type === "emergency" ? " announcement-emergency" : announcement.type === "urgent" ? " announcement-urgent" : ""}`}
                >
                  <div
                    className="announcement-header"
                    onClick={() => { if (announcement.type !== "emergency") toggleExpand(announcement.id); }}
                    style={{ cursor: announcement.type !== "emergency" ? "pointer" : "default" }}
                  >
                    <div className="announcement-badge-row">
                      {announcement.type === "emergency" && (
                        <span className="announcement-badge emergency">
                          <AlertTriangle size={14} />
                          Emergency
                        </span>
                      )}
                      {announcement.type === "urgent" && (
                        <span className="announcement-badge urgent">
                          <Bell size={14} />
                          Urgent
                        </span>
                      )}
                      {announcement.type === "info" && (
                        <span className="announcement-badge info">
                          <Megaphone size={14} />
                          Info
                        </span>
                      )}
                      <span className="announcement-time">{formatRelativeTime(announcement.createdAt)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {announcement.type !== "emergency" && (
                        <button
                          className="icon-button"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissAnnouncement(announcement.id, user.id);
                          }}
                          aria-label="Dismiss announcement"
                        >
                          <X size={15} />
                        </button>
                      )}
                      {announcement.type !== "emergency" && (
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ color: "var(--tg-hint-color)" }}
                        >
                          <ChevronDown size={16} />
                        </motion.span>
                      )}
                    </div>
                  </div>

                  <h3 className="announcement-title">{announcement.title}</h3>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="announcement-body">
                          {announcement.body.split("\n").map((line, i) => (
                            <p key={i}>{line || "\u00A0"}</p>
                          ))}
                        </div>

                        {announcement.tags && announcement.tags.length > 0 && (
                          <div className="announcement-tags" style={{ marginTop: "10px" }}>
                            {announcement.tags.map((tag) => (
                              <span key={tag} className="announcement-tag">#{tag}</span>
                            ))}
                          </div>
                        )}

                        {announcement.links && announcement.links.length > 0 && (
                          <div className="announcement-links" style={{ marginTop: "10px" }}>
                            {announcement.links.map((link) => (
                              <a key={link.label} className="announcement-link-btn" href={link.url} target="_blank" rel="noreferrer">
                                <ExternalLink size={14} />
                                <span>{link.label}</span>
                              </a>
                            ))}
                          </div>
                        )}

                        {isMainboard && (
                          <button
                            className="danger-outline-button"
                            style={{ marginTop: "10px" }}
                            type="button"
                            onClick={() => deactivateAnnouncement(announcement.id)}
                          >
                            Deactivate
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default Announcements;
