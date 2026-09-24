import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, ClipboardCheck, ExternalLink, Grid3X3, PartyPopper, ShieldCheck, TimerReset } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { BUREAUS, bureauShortLabels } from "../constants";
import { authSessionChangedEvent, shouldUseApiAuth } from "../lib/apiAuth";
import { listBureauOperations, updateBureauOperationStatus as updateOpsStatusApi } from "../lib/bureauOpsApi";
import { fetchBaiahSettings, updateBaiahSettings, type BaiahSettings, type BaiahUpdateInput } from "../lib/baiahApi";
import { fetchOpsLive, getOpsSettings, setOpsSettings, type OpsLiveData } from "../lib/guidesApi";
import { sendBureauAlert } from "../lib/notifyApi";
import { hapticError, hapticImpact, hapticSuccess } from "../lib/telegram";
import { playSfx } from "../lib/sfx";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { Bureau, BureauOperation, BureauOperationStatus } from "../types";

const statusOptions: BureauOperationStatus[] = ["pending", "active", "ready", "issue", "done"];

const toolLabels: Record<BureauOperation["tool"], string> = {
  coupon_sessions: "Coupon session",
  food_distribution: "Food checklist",
  cleanliness: "Cleanliness",
  walkie_talkies: "Walkie log",
  battery_tracking: "Battery",
  lost_found: "Lost & found",
  kit_distribution: "Kit distribution",
  vip_robes: "VIP robes",
  run_of_show: "Run of show",
  session_timers: "Timer",
  vip_cues: "VIP cues",
  attendance_sessions: "Attendance QR",
  toilet_sign: "Toilet sign",
  siren_logs: "Siren log",
  dress_code_incidents: "Dress code",
  slide_handoffs: "Slide handoff",
  nametag_batches: "Nametags",
  sickbay_log: "Sickbay",
  medicine_stock: "Medicine stock"
};

function qrLinkFor(operation: BureauOperation) {
  const slug = operation.bureau.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `https://t.me/IIUMTaarufBot?start=${operation.tool}-${slug}`;
}

function toKlInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function formatKlDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function BureauOps() {
  const { user } = useMockUser();
  const { bureauOperations, sendBureauOperationAlert, updateBureauOperationStatus } = useMockData();
  const apiMode = shouldUseApiAuth();
  const [remoteOperations, setRemoteOperations] = useState<BureauOperation[]>([]);
  const [loadingOps, setLoadingOps] = useState(false);
  const [authRefreshTick, setAuthRefreshTick] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedBureau, setSelectedBureau] = useState<Bureau | "all">(user.role === "mainboard" ? "all" : user.bureau || "Catering");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [alertingId, setAlertingId] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<OpsLiveData | null>(null);
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [applyingDelay, setApplyingDelay] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [baiah, setBaiah] = useState<BaiahSettings | null>(null);
  const [baiahAt, setBaiahAt] = useState("");
  const [baiahMsg, setBaiahMsg] = useState("");
  const [applyingBaiah, setApplyingBaiah] = useState(false);
  const baiahLoadedRef = useRef(false);

  const isMainboard = user.role === "mainboard";
  const activeOps = apiMode ? remoteOperations : bureauOperations;

  useEffect(() => {
    const handleSessionChanged = () => setAuthRefreshTick((value) => value + 1);
    window.addEventListener(authSessionChangedEvent, handleSessionChanged);
    return () => window.removeEventListener(authSessionChangedEvent, handleSessionChanged);
  }, []);

  useEffect(() => {
    if (!apiMode || user.role === "student") return;

    let cancelled = false;
    setLoadingOps(true);
    setErrorMessage("");
    listBureauOperations()
      .then((loaded) => {
        if (!cancelled) setRemoteOperations(loaded);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load bureau operations.");
          hapticError();
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOps(false);
      });

    return () => { cancelled = true; };
  }, [apiMode, authRefreshTick, user.role]);

  // Live ops dashboard (mainboard only): session delay + check-in counts polled every 10s
  useEffect(() => {
    if (!apiMode || !isMainboard) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    getOpsSettings()
      .then((settings) => {
        if (!cancelled) setDelayMinutes(settings.sessionDelayMinutes);
      })
      .catch(() => {});

    const loadLive = () => {
      fetchOpsLive()
        .then((data) => { if (!cancelled) { setLiveData(data); setLiveError(""); } })
        .catch(() => { if (!cancelled) setLiveError("Live feed unavailable."); });
    };
    loadLive();
    pollTimer = setInterval(loadLive, 10000);

    return () => { cancelled = true; if (pollTimer) clearInterval(pollTimer); };
  }, [apiMode, authRefreshTick, isMainboard]);

  const applyDelay = async (minutes: number) => {
    if (applyingDelay || minutes === delayMinutes) return;
    setApplyingDelay(true);
    setLiveError("");
    try {
      if (apiMode) {
        await setOpsSettings(minutes, true);
      }
      setDelayMinutes(minutes);
      hapticSuccess();
      playSfx("success");
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : "Failed to update session delay.");
      hapticError();
      playSfx("error");
    } finally {
      setApplyingDelay(false);
    }
  };

  // Baiah takeover status — polled so a scheduled (pg_cron) activation shows
  // up in this panel without a reload.
  useEffect(() => {
    if (!apiMode || !isMainboard) return;
    let cancelled = false;
    const loadBaiah = () => {
      fetchBaiahSettings()
        .then((next) => {
          if (cancelled) return;
          setBaiah(next);
          if (!baiahLoadedRef.current) {
            baiahLoadedRef.current = true;
            setBaiahMsg(next.baiahMessage);
            setBaiahAt(toKlInputValue(next.baiahStartAt));
          }
        })
        .catch(() => {});
    };
    loadBaiah();
    const timer = window.setInterval(loadBaiah, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [apiMode, isMainboard, authRefreshTick]);

  const applyBaiah = async (patch: BaiahUpdateInput) => {
    if (applyingBaiah) return;
    setApplyingBaiah(true);
    setLiveError("");
    try {
      const updated = await updateBaiahSettings(patch);
      setBaiah(updated);
      setBaiahAt(toKlInputValue(updated.baiahStartAt));
      hapticSuccess();
      playSfx(patch.active === true ? "send" : "success");
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : "Failed to update Baiah takeover.");
      hapticError();
      playSfx("error");
    } finally {
      setApplyingBaiah(false);
    }
  };

  const hasOpsAccess = user.role === "mainboard" || Boolean(user.bureau);
  const visibleOperations = useMemo(() => {
    if (user.role === "mainboard") {
      return selectedBureau === "all" ? activeOps : activeOps.filter((item) => item.bureau === selectedBureau);
    }
    return activeOps.filter((item) => item.bureau === user.bureau);
  }, [activeOps, selectedBureau, user.bureau, user.role]);

  const summary = useMemo(() => {
    const items = user.role === "mainboard" ? activeOps : visibleOperations;
    return {
      active: items.filter((item) => item.status === "active").length,
      issues: items.filter((item) => item.status === "issue").length,
      ready: items.filter((item) => item.status === "ready" || item.status === "done").length
    };
  }, [activeOps, user.role, visibleOperations]);

  const updateStatus = async (id: string, status: BureauOperationStatus) => {
    if (updatingId || alertingId) return;
    setUpdatingId(id);
    setErrorMessage("");
    try {
      if (apiMode) {
        const updated = await updateOpsStatusApi(id, status);
        setRemoteOperations((items) => items.map((item) => (item.id === id ? updated : item)));
      } else {
        updateBureauOperationStatus(id, status);
      }
      hapticImpact(status === "issue" ? "heavy" : "light");
      playSfx(status === "issue" ? "warning" : "select");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update operation.");
      hapticError();
      playSfx("error");
    } finally {
      setUpdatingId(null);
    }
  };

  const sendAlert = async (id: string) => {
    if (updatingId || alertingId) return;
    setAlertingId(id);
    setErrorMessage("");
    try {
      if (apiMode) {
        await sendBureauAlert({ id });
      } else {
        sendBureauOperationAlert(id);
      }
      hapticSuccess();
      playSfx("send");
    } catch {
      hapticError();
      playSfx("error");
    } finally {
      setAlertingId(null);
    }
  };

  if (!hasOpsAccess) {
    return (
      <section className="page-stack">
        <EmptyState icon={Grid3X3} title="Committee operations" body="Bureau tools are available to committee members and mainboard." />
      </section>
    );
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Phase 2</p>
          <h2>Bureau Operations</h2>
        </div>
        <span className="soft-chip">{user.role === "mainboard" ? "All bureaus" : user.bureau} · {apiMode ? "Supabase" : "Mock"}</span>
      </div>

      {errorMessage && (
        <div className="banner banner-emergency">
          <Grid3X3 size={18} />
          <div>
            <strong>Error</strong>
            <p>{errorMessage}</p>
          </div>
          <button className="icon-button" onClick={() => { playSfx("close"); setErrorMessage(""); }} aria-label="Dismiss error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}

      <div className="metric-grid">
        <article>
          <span>Active tools</span>
          <strong>{summary.active}</strong>
        </article>
        <article>
          <span>Need attention</span>
          <strong>{summary.issues}</strong>
        </article>
        <article>
          <span>Ready / done</span>
          <strong>{summary.ready}</strong>
        </article>
      </div>

      {isMainboard && (
        <section className="ops-panel">
          <div className="section-heading">
            <h3>Live check-ins</h3>
            {liveData ? <span>{liveData.total} today · {liveData.session.virtualDate}</span> : <span>—</span>}
          </div>

          {liveError && <p className="muted" style={{ color: "#c93d37" }}>{liveError}</p>}

          {liveData ? (
            <>
              <div className="metric-grid">
                <article>
                  <span>Total check-ins</span>
                  <strong>{liveData.total}</strong>
                </article>
                {liveData.sessions.map((session) => (
                  <article key={session.block}>
                    <span>{session.block === "before_break" ? "Morning" : "Afternoon"}</span>
                    <strong style={{ color: session.open ? "var(--gold-accent)" : undefined }}>{session.open ? "OPEN" : "Closed"}</strong>
                  </article>
                ))}
              </div>

              {liveData.byVenue.length === 0 ? (
                <p className="muted">No check-ins recorded yet for today's sessions.</p>
              ) : (
                <div className="live-venue-grid">
                  {liveData.byVenue.map(({ venue, count }) => (
                    <div key={venue} className="live-venue-chip">
                      <strong>{count}</strong>
                      <span>{venue}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="skeleton-page" />
          )}

          <div className="delay-control">
            <span className="delay-control-label">
              <TimerReset size={15} aria-hidden="true" />
              Session delay (broadcast to committee)
            </span>
            <div className="segmented-actions">
              {[0, 15, 30].map((minutes) => (
                <button
                  key={minutes}
                  className={delayMinutes === minutes ? "selected" : ""}
                  type="button"
                  disabled={applyingDelay}
                  onClick={() => applyDelay(minutes)}
                >
                  {minutes === 0 ? "On time" : `+${minutes} mins`}
                </button>
              ))}
            </div>
          </div>

          {apiMode && (
            <div className="baiah-control">
              <span className="delay-control-label">
                <PartyPopper size={15} aria-hidden="true" />
                Baiah takeover {baiah ? (baiah.isBaiahActive ? "· LIVE" : baiah.baiahStartAt ? "· scheduled" : "· off") : "· …"}
              </span>
              <p className="muted">
                {baiah?.isBaiahActive
                  ? `Live since ${formatKlDateTime(baiah.baiahActivatedAt)}${baiah.baiahUpdatedBy ? ` · by ${baiah.baiahUpdatedBy}` : ""}. Each user's overlay auto-hides after 30 minutes; Deactivate ends it immediately for everyone.`
                  : baiah?.baiahStartAt
                    ? `Scheduled for ${formatKlDateTime(baiah.baiahStartAt)} (Malaysia time). Fires automatically.`
                    : "Off. When activated, everyone with the app open gets a full-screen confetti takeover."}
              </p>
              <div className="baiah-control-row">
                <input
                  type="text"
                  value={baiahMsg}
                  maxLength={140}
                  placeholder="BAIAH 2026: WELCOME TO IIUM"
                  aria-label="Takeover message"
                  onChange={(event) => setBaiahMsg(event.target.value)}
                />
                <button
                  type="button"
                  disabled={applyingBaiah || !baiahMsg.trim() || baiahMsg.trim() === (baiah?.baiahMessage || "")}
                  onClick={() => applyBaiah({ message: baiahMsg })}
                >
                  Save
                </button>
              </div>
              <div className="baiah-control-row">
                <input
                  type="datetime-local"
                  value={baiahAt}
                  aria-label="Schedule time (Malaysia)"
                  onChange={(event) => setBaiahAt(event.target.value)}
                />
                <button
                  type="button"
                  disabled={applyingBaiah || !baiahAt}
                  onClick={() => applyBaiah({ scheduledAt: baiahAt })}
                >
                  Schedule
                </button>
                {baiah?.baiahStartAt && (
                  <button type="button" disabled={applyingBaiah} onClick={() => applyBaiah({ scheduledAt: null })}>
                    Clear
                  </button>
                )}
              </div>
              <label className="baiah-notify-toggle">
                <input
                  type="checkbox"
                  checked={baiah?.baiahNotify !== false}
                  disabled={applyingBaiah || !baiah}
                  onChange={(event) => applyBaiah({ notify: event.target.checked })}
                />
                Also announce on Telegram (pulls in students who don&apos;t have the app open)
              </label>
              <div className="baiah-actions">
                <button
                  type="button"
                  className="primary"
                  disabled={applyingBaiah || !baiah || baiah.isBaiahActive}
                  onClick={() => applyBaiah({ active: true })}
                >
                  🎉 Activate now
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={applyingBaiah || !baiah?.isBaiahActive}
                  onClick={() => applyBaiah({ active: false })}
                >
                  Deactivate
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {user.role === "mainboard" && (
        <div className="bureau-filter" aria-label="Bureau filter">
          <button className={selectedBureau === "all" ? "selected" : ""} type="button" onClick={() => { if (selectedBureau !== "all") playSfx("select"); setSelectedBureau("all"); }}>
            All
          </button>
          {BUREAUS.map((bureau) => (
            <button
              className={selectedBureau === bureau ? "selected" : ""}
              key={bureau}
              type="button"
              onClick={() => { if (selectedBureau !== bureau) playSfx("select"); setSelectedBureau(bureau); }}
            >
              {bureauShortLabels[bureau]}
            </button>
          ))}
        </div>
      )}

      {visibleOperations.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No tools visible" body="Operational tools will appear when a bureau is selected." />
      ) : (
        <div className="bureau-ops-grid">
          {visibleOperations.map((operation) => (
            <article className={`bureau-op-card status-edge-${operation.status}`} key={operation.id}>
              <div className="bureau-op-header">
                <div>
                  <span className="soft-chip">{toolLabels[operation.tool]}</span>
                  <h3>{operation.title}</h3>
                </div>
                <StatusBadge value={operation.status} />
              </div>

              <p>{operation.detail}</p>
              <div className="bureau-op-meta">
                <span>{operation.bureau}</span>
                <span>{operation.owner}</span>
                <span>{operation.metric}</span>
              </div>

              {operation.tool === "attendance_sessions" && (
                <a className="ops-link" href={qrLinkFor(operation)} target="_blank" rel="noreferrer" onClick={() => playSfx("forward")}>
                  <ExternalLink size={15} aria-hidden="true" />
                  <span>Mock QR invite link</span>
                </a>
              )}

              {operation.tool === "toilet_sign" && (
                <div className="toilet-sign-preview">
                  <strong>{operation.status === "issue" ? "Cleaning / closed" : "Available"}</strong>
                  <span>{operation.metric}</span>
                </div>
              )}

              <div className="segmented-actions ops-status-actions">
                {statusOptions.map((status) => (
                  <button
                    className={operation.status === status ? "selected" : ""}
                    key={status}
                    type="button"
                    disabled={updatingId !== null || alertingId !== null}
                    onClick={() => updateStatus(operation.id, status)}
                  >
                    {updatingId === operation.id ? "..." : status}
                  </button>
                ))}
              </div>

              <button className="icon-text-button full-width" type="button" disabled={updatingId !== null || alertingId !== null} onClick={() => sendAlert(operation.id)}>
                <BellRing size={16} aria-hidden="true" />
                <span>{alertingId === operation.id ? "Sending..." : apiMode ? "Send alert" : "Mock group alert"}</span>
              </button>
            </article>
          ))}
        </div>
      )}

      <section className="ops-panel">
        <div className="section-heading">
          <h3>Analog fallback</h3>
          <ShieldCheck size={18} aria-hidden="true" />
        </div>
        <p className="muted">
          Critical updates should still be mirrored through physical walkie-talkies and bureau heads if the app or network becomes unstable.
        </p>
      </section>
    </section>
  );
}

export default BureauOps;
