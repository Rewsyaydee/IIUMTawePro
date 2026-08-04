import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HeartPulse, ShieldCheck } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { authSessionChangedEvent, shouldUseApiAuth } from "../lib/apiAuth";
import { hapticError, hapticSuccess } from "../lib/telegram";
import {
  listWellbeingReports,
  submitWellbeingReport as submitWellbeingReportApi,
  updateWellbeingReportStatus as updateWellbeingReportStatusApi
} from "../lib/wellbeingApi";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { WellbeingReport } from "../types";

const categories = ["Dizzy", "Injury", "Lost group", "Medication", "Anxiety", "Other"];

const PHONE_STORAGE_KEY = "tawepro-wellbeing-phone";

const MANAGER_STATUS_ACTIONS: Array<{ db: WellbeingReport["status"]; label: string }> = [
  { db: "responded", label: "Responding" },
  { db: "resolved", label: "Resolved" },
  { db: "escalated", label: "Escalated" }
];

function Wellbeing() {
  const { user } = useMockUser();
  const { reports, addReport, updateReportStatus } = useMockData();
  const apiMode = shouldUseApiAuth();
  const [remoteReports, setRemoteReports] = useState<WellbeingReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [authRefreshTick, setAuthRefreshTick] = useState(0);
  const [form, setForm] = useState(() => ({
    studentName: user.name || "",
    phone: localStorage.getItem(PHONE_STORAGE_KEY) || "",
    category: categories[0],
    notes: ""
  }));
  const [latestReference, setLatestReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleSessionChanged = () => setAuthRefreshTick((value) => value + 1);
    window.addEventListener(authSessionChangedEvent, handleSessionChanged);
    return () => window.removeEventListener(authSessionChangedEvent, handleSessionChanged);
  }, []);

  useEffect(() => {
    if (!apiMode) return;

    let cancelled = false;
    setLoadingReports(true);
    setErrorMessage("");
    listWellbeingReports()
      .then((loaded) => {
        if (!cancelled) setRemoteReports(loaded);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load reports.");
          hapticError();
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingReports(false);
      });

    return () => { cancelled = true; };
  }, [apiMode, authRefreshTick]);

  const submitReport = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      if (apiMode) {
        const report = await submitWellbeingReportApi(form);
        setRemoteReports((items) => [report, ...items]);
        setLatestReference(report.reference);
      } else {
        const report = addReport(form);
        setLatestReference(report.reference);
      }

      setForm((current) => ({ ...current, studentName: user.name || "", notes: "" }));
      localStorage.setItem(PHONE_STORAGE_KEY, form.phone);
      hapticSuccess();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to submit report.");
      hapticError();
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: WellbeingReport["status"]) => {
    if (updatingId) return;
    setUpdatingId(id);
    setErrorMessage("");
    try {
      if (apiMode) {
        const updated = await updateWellbeingReportStatusApi(id, status);
        setRemoteReports((items) => items.map((item) => (item.id === id ? updated : item)));
      } else {
        updateReportStatus(id, status);
      }
      hapticSuccess();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update report.");
      hapticError();
    } finally {
      setUpdatingId(null);
    }
  };

  const canManageReports = user.role === "mainboard" || user.bureau === "Welfare";
  const activeReportsAll = apiMode ? remoteReports : reports;

  // Managers: active queue excludes resolved; resolved go to a separate history section.
  const managerActive = canManageReports ? activeReportsAll.filter((r) => r.status !== "resolved") : [];
  const managerResolved = canManageReports ? activeReportsAll.filter((r) => r.status === "resolved") : [];
  // Students: only their own unresolved reports, latest 3.
  const studentVisible = !canManageReports ? activeReportsAll.filter((r) => r.status !== "resolved").slice(0, 3) : [];

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Safety</p>
          <h2>Wellbeing</h2>
        </div>
        <span className="soft-chip">{apiMode ? "Supabase" : "Mock"}</span>
      </div>

      {errorMessage && (
        <div className="banner banner-emergency">
          <HeartPulse size={18} />
          <div>
            <strong>Error</strong>
            <p>{errorMessage}</p>
          </div>
          <button className="icon-button" onClick={() => setErrorMessage("")} aria-label="Dismiss error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}

      <form className="form-card" onSubmit={submitReport}>
        <div className="form-title">
          <HeartPulse size={20} aria-hidden="true" />
          <h3>Report a concern</h3>
        </div>
        <label>
          <span>Student name</span>
          <input
            value={form.studentName}
            required
            placeholder={user.name || "Your name"}
            onChange={(event) => setForm((current) => ({ ...current, studentName: event.target.value }))}
          />
        </label>
        <label>
          <span>Phone</span>
          <input value={form.phone} required placeholder="+60123456789" onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
        </label>
        <label>
          <span>Category</span>
          <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Notes</span>
          <textarea
            value={form.notes}
            required
            rows={4}
            placeholder="Describe the concern or situation..."
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </label>
        <button className="primary-button full-width" type="submit" disabled={submitting}>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{submitting ? "Submitting..." : "Submit report"}</span>
        </button>
        {latestReference && (
          <motion.p className="success-note" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            Reference {latestReference}
          </motion.p>
        )}
      </form>

      {canManageReports && (
        <>
          <section className="ops-panel">
            <div className="section-heading">
              <h3>Welfare dashboard</h3>
              <span>{managerActive.length} active</span>
            </div>
            {loadingReports ? (
              <div className="skeleton-page" />
            ) : managerActive.length === 0 ? (
              <EmptyState icon={HeartPulse} title="Queue clear" body="New reports will appear here as they come in." />
            ) : (
              <div className="report-list">
                {managerActive.map((report, index) => (
                  <motion.article
                    key={report.id}
                    className="report-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div>
                      <div className="report-title">
                        <strong>{report.reference}</strong>
                        <StatusBadge value={report.status} />
                      </div>
                      <h4>{report.studentName}</h4>
                      <p>{report.category}</p>
                      <p className="muted">{report.notes}</p>
                    </div>
                    <div className="segmented-actions">
                      {MANAGER_STATUS_ACTIONS.map(({ db, label }) => (
                        <button
                          key={db}
                          type="button"
                          disabled={updatingId !== null}
                          onClick={() => handleStatusUpdate(report.id, db)}
                        >
                          {updatingId === report.id ? "..." : label}
                        </button>
                      ))}
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </section>

          {managerResolved.length > 0 && (
            <section className="ops-panel">
              <div className="section-heading">
                <h3>Resolved history</h3>
                <span>{managerResolved.length}</span>
              </div>
              <div className="report-list">
                {managerResolved.map((report, index) => (
                  <motion.article
                    key={report.id}
                    className="report-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div>
                      <div className="report-title">
                        <strong>{report.reference}</strong>
                        <StatusBadge value={report.status} />
                      </div>
                      <h4>{report.studentName}</h4>
                      <p>{report.category}</p>
                      <p className="muted">{report.notes}</p>
                    </div>
                  </motion.article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!canManageReports && studentVisible.length > 0 && (
        <section className="ops-panel">
          <div className="section-heading">
            <h3>Your reports</h3>
            <span>{studentVisible.length}</span>
          </div>
          <div className="report-list">
            {studentVisible.map((report, index) => (
              <motion.article
                key={report.id}
                className="report-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div>
                  <div className="report-title">
                    <strong>{report.reference}</strong>
                    <StatusBadge value={report.status} />
                  </div>
                  <h4>{report.studentName}</h4>
                  <p>{report.category}</p>
                  <p className="muted">{report.notes}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      )}
      {!canManageReports && studentVisible.length === 0 && (
        <div className="empty-state" style={{ padding: "2rem 0" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          <strong>No reports submitted yet</strong>
          <p>Your wellbeing reports will appear here once you submit one using the form above.</p>
        </div>
      )}
    </section>
  );
}

export default Wellbeing;
