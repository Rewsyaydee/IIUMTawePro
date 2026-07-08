import { useEffect, useMemo, useState } from "react";
import { BellRing, ClipboardCheck, ExternalLink, Grid3X3, ShieldCheck } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { BUREAUS, bureauShortLabels } from "../constants";
import { authSessionChangedEvent, shouldUseApiAuth } from "../lib/apiAuth";
import { listBureauOperations, updateBureauOperationStatus as updateOpsStatusApi } from "../lib/bureauOpsApi";
import { hapticError, hapticImpact, hapticSuccess } from "../lib/telegram";
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

function BureauOps() {
  const { user } = useMockUser();
  const { bureauOperations, sendBureauOperationAlert, updateBureauOperationStatus } = useMockData();
  const apiMode = shouldUseApiAuth();
  const [remoteOperations, setRemoteOperations] = useState<BureauOperation[]>([]);
  const [loadingOps, setLoadingOps] = useState(false);
  const [authRefreshTick, setAuthRefreshTick] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedBureau, setSelectedBureau] = useState<Bureau | "all">(user.role === "mainboard" ? "all" : user.bureau || "Catering");

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
    try {
      if (apiMode) {
        const updated = await updateOpsStatusApi(id, status);
        setRemoteOperations((items) => items.map((item) => (item.id === id ? updated : item)));
      } else {
        updateBureauOperationStatus(id, status);
      }
      hapticImpact(status === "issue" ? "heavy" : "light");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update operation.");
      hapticError();
    }
  };

  const sendAlert = (id: string) => {
    sendBureauOperationAlert(id);
    hapticSuccess();
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
          <button className="icon-button" onClick={() => setErrorMessage("")} aria-label="Dismiss error">
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

      {user.role === "mainboard" && (
        <div className="bureau-filter" aria-label="Bureau filter">
          <button className={selectedBureau === "all" ? "selected" : ""} type="button" onClick={() => setSelectedBureau("all")}>
            All
          </button>
          {BUREAUS.map((bureau) => (
            <button
              className={selectedBureau === bureau ? "selected" : ""}
              key={bureau}
              type="button"
              onClick={() => setSelectedBureau(bureau)}
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
                <a className="ops-link" href={qrLinkFor(operation)} target="_blank" rel="noreferrer">
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
                    onClick={() => updateStatus(operation.id, status)}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <button className="icon-text-button full-width" type="button" onClick={() => sendAlert(operation.id)}>
                <BellRing size={16} aria-hidden="true" />
                <span>Mock group alert</span>
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
