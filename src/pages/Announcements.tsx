import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ExternalLink, Megaphone, PenLine, Trash2, X, AlertTriangle, Bell } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { authSessionChangedEvent, shouldUseApiAuth } from "../lib/apiAuth";
import { deactivateAnnouncementApi, deleteAnnouncementApi, listAnnouncements, updateAnnouncement } from "../lib/announcementsApi";
import { playSfx } from "../lib/sfx";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { Announcement } from "../types";

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

const announcementTypes = ["info", "urgent", "emergency"] as const;

function Announcements() {
  const { user } = useMockUser();
  const { announcements, dismissAnnouncement, deactivateAnnouncement } = useMockData();
  const apiMode = shouldUseApiAuth();
  const [remoteAnnouncements, setRemoteAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [authTick, setAuthTick] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", body: "", type: "info" as string });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleSessionChanged = () => setAuthTick((v) => v + 1);
    window.addEventListener(authSessionChangedEvent, handleSessionChanged);
    return () => window.removeEventListener(authSessionChangedEvent, handleSessionChanged);
  }, []);

  useEffect(() => {
    if (!apiMode) return;
    let cancelled = false;
    setLoading(true);
    setErrorMessage("");
    listAnnouncements()
      .then((loaded) => { if (!cancelled) setRemoteAnnouncements(loaded); })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : "Unable to load announcements.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiMode, authTick]);

  const allAnnouncements = apiMode ? remoteAnnouncements : announcements;
  const active = allAnnouncements.filter((a) => a.isActive && !a.dismissedBy?.includes(user.id));
  const sorted = [...active].sort((a, b) => {
    if (a.type === "emergency" && b.type !== "emergency") return -1;
    if (b.type === "emergency" && a.type !== "emergency") return 1;
    if (a.type === "urgent" && b.type === "info") return -1;
    if (b.type === "urgent" && a.type === "info") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const isMainboard = user.role === "mainboard";

  const toggleExpand = (id: string) => {
    const willExpand = expandedId !== id;
    playSfx(willExpand ? "expand" : "collapse");
    setExpandedId(willExpand ? id : null);
  };

  const startEdit = (announcement: Announcement) => {
    setEditForm({ title: announcement.title, body: announcement.body, type: announcement.type });
    setEditingId(announcement.id);
    setErrorMessage("");
    playSfx("open");
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !editingId) return;
    setSaving(true);
    setErrorMessage("");
    try {
      const updated = await updateAnnouncement(editingId, editForm);
      setRemoteAnnouncements((items) => items.map((item) => (item.id === editingId ? updated : item)));
      setEditingId(null);
      playSfx("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save announcement.");
      playSfx("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMessage("");
    try {
      if (apiMode) {
        await deleteAnnouncementApi(id);
        setRemoteAnnouncements((items) => items.filter((item) => item.id !== id));
      } else {
        deactivateAnnouncement(id);
      }
      setConfirmDeleteId(null);
      playSfx("delete");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete announcement.");
      playSfx("error");
    }
  };

  const handleDeactivate = async (id: string) => {
    setErrorMessage("");
    try {
      if (apiMode) {
        await deactivateAnnouncementApi(id);
        setRemoteAnnouncements((items) => items.filter((item) => item.id !== id));
      } else {
        deactivateAnnouncement(id);
      }
      playSfx("toggle-off");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to deactivate announcement.");
      playSfx("error");
    }
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Updates</p>
          <h2>Announcements</h2>
        </div>
        <span className="soft-chip">{loading ? "loading" : `${active.length} active`}</span>
      </div>

      {errorMessage && (
        <div className="banner banner-emergency">
          <Megaphone size={18} />
          <div>
            <strong>Error</strong>
            <p>{errorMessage}</p>
          </div>
          <button className="icon-button" onClick={() => setErrorMessage("")} aria-label="Dismiss error">
            <X size={15} />
          </button>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon={Bell} title="No announcements" body="Important updates from the committee will appear here." />
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          {sorted.map((announcement) => {
            const isExpanded = announcement.type === "emergency" || expandedId === announcement.id;
            const isEditing = editingId === announcement.id;

            return (
              <motion.div
                key={announcement.id}
                drag={apiMode ? false : announcement.type !== "emergency" ? "x" : false}
                dragConstraints={{ left: -200, right: 0 }}
                dragElastic={0.7}
                onDragEnd={(_, info) => {
                  if (!apiMode && info.offset.x < -120) {
                    dismissAnnouncement(announcement.id, user.id);
                    playSfx("swipe");
                  }
                }}
                whileDrag={{ scale: 0.98, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                className="swipeable-card"
              >
                {!apiMode && announcement.type !== "emergency" && (
                  <div className="swipe-delete-bg">
                    <svg className="swipeable-delete-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                  </div>
                )}
                <article
                  className={`announcement-card${announcement.type === "emergency" ? " announcement-emergency" : announcement.type === "urgent" ? " announcement-urgent" : ""}`}
                  onClick={() => { if (announcement.type !== "emergency") toggleExpand(announcement.id); }}
                  style={{ cursor: announcement.type !== "emergency" ? "pointer" : "default" }}
                >
                  <div className="announcement-header">
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
                      {!apiMode && announcement.type !== "emergency" && (
                        <button
                          className="icon-button"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissAnnouncement(announcement.id, user.id);
                            playSfx("delete");
                          }}
                          aria-label="Dismiss announcement"
                        >
                          <X size={15} />
                        </button>
                      )}
                      {isMainboard && apiMode && (
                        <button
                          className="icon-button"
                          type="button"
                          aria-label="Edit announcement"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(announcement);
                          }}
                        >
                          <PenLine size={15} />
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

                  {isEditing ? (
                    <motion.form className="form-card compact inline-editor" onSubmit={saveEdit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={(e) => e.stopPropagation()}>
                      <label>
                        <span>Title</span>
                        <input required value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
                      </label>
                      <label>
                        <span>Type</span>
                        <select value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}>
                          {announcementTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Body</span>
                        <textarea required rows={5} value={editForm.body} onChange={(e) => setEditForm((f) => ({ ...f, body: e.target.value }))} />
                      </label>
                      <div className="form-actions">
                        <button className="primary-button" type="submit" disabled={saving}>
                          <Check size={15} aria-hidden="true" />
                          <span>{saving ? "..." : "Save"}</span>
                        </button>
                        <button className="outline-button" type="button" onClick={() => { playSfx("cancel"); setEditingId(null); }}>Cancel</button>
                      </div>
                    </motion.form>
                  ) : (
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
                            <div className="inline-row-actions" style={{ marginTop: "10px" }}>
                              {confirmDeleteId === announcement.id ? (
                                <div className="inline-confirm">
                                  <span>Delete permanently?</span>
                                  <button type="button" className="danger-outline-button" onClick={() => handleDelete(announcement.id)}>Yes</button>
                                  <button type="button" className="outline-button" onClick={() => { playSfx("cancel"); setConfirmDeleteId(null); }}>No</button>
                                </div>
                              ) : (
                                <button
                                  className="danger-outline-button"
                                  type="button"
                                  onClick={() => setConfirmDeleteId(announcement.id)}
                                >
                                  <Trash2 size={14} aria-hidden="true" />
                                  <span>Delete</span>
                                </button>
                              )}
                              <button
                                className="outline-button"
                                type="button"
                                onClick={() => handleDeactivate(announcement.id)}
                              >
                                Deactivate
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
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
