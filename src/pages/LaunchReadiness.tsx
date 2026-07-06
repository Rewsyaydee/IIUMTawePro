import { Activity, AlertTriangle, CheckCircle2, ExternalLink, KeyRound, Rocket, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { getLaunchReadiness, type LaunchStatus } from "../lib/launchReadiness";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";

const statusIcons: Record<LaunchStatus, typeof CheckCircle2> = {
  ready: CheckCircle2,
  warning: AlertTriangle,
  missing: ShieldAlert
};

function LaunchReadiness() {
  const { user } = useMockUser();
  const { auditLog, attendanceProofs, bureauOperations, notifications, schedule } = useMockData();
  const readiness = getLaunchReadiness();

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

  if (user.role !== "mainboard") {
    return (
      <section className="page-stack">
        <div className="empty-state tall">
          <ShieldAlert size={28} aria-hidden="true" />
          <strong>Mainboard only</strong>
          <p>Switch to the mainboard mock profile to review launch readiness.</p>
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
