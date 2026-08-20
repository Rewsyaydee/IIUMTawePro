import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, ClipboardCheck, ExternalLink, KeyRound, Rocket, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { getLaunchReadiness, type LaunchStatus } from "../lib/launchReadiness";
import { authSessionChangedEvent, shouldUseApiAuth } from "../lib/apiAuth";
import { listLaunchChecklist, updateLaunchChecklist, type LaunchChecklistItem } from "../lib/guidesApi";
import { hapticError, hapticImpact } from "../lib/telegram";
import { playSfx } from "../lib/sfx";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";

const statusIcons: Record<LaunchStatus, typeof CheckCircle2> = {
  ready: CheckCircle2,
  warning: AlertTriangle,
  missing: ShieldAlert
};

const checklistStatuses: LaunchChecklistItem["status"][] = ["pending", "ready", "issue"];

function LaunchReadiness() {
  const { user } = useMockUser();
  const { auditLog, attendanceProofs, bureauOperations, notifications, schedule } = useMockData();
  const readiness = getLaunchReadiness();
  const apiMode = shouldUseApiAuth();
  const [items, setItems] = useState<LaunchChecklistItem[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [checklistError, setChecklistError] = useState("");
  const [authTick, setAuthTick] = useState(0);

  const canManageChecklist = user.role === "mainboard" || user.role === "head";

  useEffect(() => {
    const h = () => setAuthTick((v) => v + 1);
    window.addEventListener(authSessionChangedEvent, h);
    return () => window.removeEventListener(authSessionChangedEvent, h);
  }, []);

  useEffect(() => {
    if (!apiMode || user.role === "student") return;
    let cancelled = false;
    setLoadingChecklist(true);
    setChecklistError("");
    listLaunchChecklist()
      .then((loaded) => { if (!cancelled) setItems(loaded); })
      .catch((error) => {
        if (!cancelled) setChecklistError(error instanceof Error ? error.message : "Unable to load checklist.");
      })
      .finally(() => { if (!cancelled) setLoadingChecklist(false); });
    return () => { cancelled = true; };
  }, [apiMode, authTick, user.role]);

  const setChecklistStatus = async (id: string, status: LaunchChecklistItem["status"]) => {
    if (updatingId) return;
    setUpdatingId(id);
    setChecklistError("");
    try {
      if (apiMode) {
        const updated = await updateLaunchChecklist(id, status);
        setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      } else {
        setItems((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
      }
      hapticImpact(status === "issue" ? "heavy" : "light");
      playSfx(status === "issue" ? "warning" : status === "ready" ? "check" : "uncheck");
    } catch (error) {
      setChecklistError(error instanceof Error ? error.message : "Failed to update checklist item.");
      hapticError();
      playSfx("error");
    } finally {
      setUpdatingId(null);
    }
  };

  const launchNumbers = [
    { label: "Ready checks", value: readiness.summary.ready },
    { label: "Warnings", value: readiness.summary.warning },
    { label: "Missing", value: readiness.summary.missing },
    { label: "Audit records", value: auditLog.length }
  ];

  const productionRisks = [
    {
      title: "Role claims must come from server",
      detail: "The preview switcher is only for local testing. Production must trust Telegram initData and server-issued claims.",
      icon: KeyRound
    },
    {
      title: "Special Task review stays protected",
      detail: `${attendanceProofs.filter((proof) => proof.status === "pending_review").length} punch card proof is waiting in the current mock queue.`,
      icon: ShieldCheck
    },
    {
      title: "Operational issues need owner routing",
      detail: `${bureauOperations.filter((operation) => operation.status === "issue").length} bureau operation records currently show an issue.`,
      icon: Activity
    },
    {
      title: "Notifications need bot delivery logs",
      detail: `${notifications.length} mock notification record exists. Production should log Telegram send status and retries.`,
      icon: Rocket
    }
  ];

  if (user.role === "student") {
    return (
      <section className="page-stack">
        <div className="empty-state tall">
          <ShieldAlert size={28} aria-hidden="true" />
          <strong>Committee area</strong>
          <p>Launch readiness is available to committee, heads, and mainboard roles.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Production gate</p>
          <h2>Launch Readiness</h2>
        </div>
        <span className={readiness.canLaunch ? "soft-chip launch-ready" : "soft-chip launch-warning"}>
          {readiness.canLaunch ? "Ready to release" : "Prototype mode"}
        </span>
      </div>

      <section className="launch-hero">
        <div>
          <p className="eyebrow">IIUM public release care</p>
          <h3>{readiness.canLaunch ? "Production checks are green" : "Keep this as an impressive demo for now"}</h3>
          <p>
            This screen separates mock confidence from real launch confidence, so mainboard can protect the event flow and the IIUM name.
          </p>
        </div>
        <div className="launch-score">
          <Rocket size={22} aria-hidden="true" />
          <strong>{readiness.summary.ready}/{readiness.checks.length}</strong>
          <span>checks ready</span>
        </div>
      </section>

      <div className="metric-grid">
        {launchNumbers.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <section className="ops-panel">
        <div className="section-heading">
          <h3>Environment checks</h3>
          <span>{readiness.mode}</span>
        </div>
        <div className="launch-check-list">
          {readiness.checks.map((check) => {
            const Icon = statusIcons[check.status];
            return (
              <article className={`launch-check check-${check.status}`} key={check.id}>
                <Icon size={20} aria-hidden="true" />
                <div>
                  <div className="launch-check-title">
                    <strong>{check.title}</strong>
                    <StatusBadge value={check.status === "ready" ? "ready" : check.status === "warning" ? "pending" : "blocked"} />
                  </div>
                  <p>{check.detail}</p>
                  <span>
                    {check.owner}: {check.action}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ops-panel">
        <div className="section-heading">
          <h3>Event readiness checklist</h3>
          <span>{loadingChecklist ? "loading" : `${items.filter((i) => i.status === "ready").length}/${items.length} ready`}</span>
        </div>
        <p className="muted">
          Logistics officers toggle each item as it is confirmed on the ground.
        </p>
        {checklistError && <p className="muted" style={{ color: "#c93d37" }}>{checklistError}</p>}
        {loadingChecklist ? (
          <div className="skeleton-page" />
        ) : items.length === 0 ? (
          <div className="empty-state">
            <ClipboardCheck size={24} aria-hidden="true" />
            <strong>No checklist items</strong>
            <p>Checklist items will appear once seeded in the database.</p>
          </div>
        ) : (
          <div className="launch-checklist-list">
            {items.map((item) => (
              <article key={item.id} className={`launch-checklist-item status-${item.status}`}>
                <div className="launch-checklist-main">
                  <strong>{item.title}</strong>
                  <span>
                    {item.category} · {item.owner || "Unassigned"}
                  </span>
                </div>
                {canManageChecklist ? (
                  <div className="segmented-actions launch-checklist-status">
                    {checklistStatuses.map((status) => (
                      <button
                        key={status}
                        className={item.status === status ? "selected" : ""}
                        type="button"
                        disabled={updatingId !== null}
                        onClick={() => setChecklistStatus(item.id, status)}
                      >
                        {updatingId === item.id ? "..." : status}
                      </button>
                    ))}
                  </div>
                ) : (
                  <StatusBadge value={item.status === "ready" ? "ready" : item.status === "issue" ? "blocked" : "pending"} />
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="ops-panel">
        <div className="section-heading">
          <h3>Production milestones</h3>
          <span>{readiness.milestones.length} gates</span>
        </div>
        <div className="launch-milestone-list">
          {readiness.milestones.map((milestone, index) => (
            <article key={milestone.title}>
              <span>{index + 1}</span>
              <div>
                <strong>{milestone.title}</strong>
                <p>{milestone.detail}</p>
              </div>
              <StatusBadge value={milestone.status === "ready" ? "ready" : milestone.status === "warning" ? "pending" : "blocked"} />
            </article>
          ))}
        </div>
      </section>

      <section className="ops-panel">
        <div className="section-heading">
          <h3>Risk focus</h3>
          <span>{schedule.length} programme items</span>
        </div>
        <div className="admin-insight-grid">
          {productionRisks.map((risk) => {
            const Icon = risk.icon;
            return (
              <article key={risk.title}>
                <Icon size={18} aria-hidden="true" />
                <strong>{risk.title}</strong>
                <p>{risk.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <Link className="ops-link" to="/mainboard">
        <ExternalLink size={16} aria-hidden="true" />
        <span>Return to Control Room</span>
      </Link>
    </section>
  );
}

export default LaunchReadiness;
