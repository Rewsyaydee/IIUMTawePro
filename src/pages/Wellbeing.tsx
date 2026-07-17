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

function Wellbeing() {
  const { user } = useMockUser();
  const { reports, addReport, updateReportStatus } = useMockData();
  const apiMode = shouldUseApiAuth();
  const [remoteReports, setRemoteReports] = useState<WellbeingReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [authRefreshTick, setAuthRefreshTick] = useState(0);
  const [form, setForm] = useState({
    studentName: "",
    phone: "",
    category: categories[0],
    notes: ""
  });
  const [latestReference, setLatestReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canManageReports = user.role === "mainboard" || user.bureau === "Welfare";
  const activeReports = apiMode ? remoteReports : reports;

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

      setForm({ studentName: "", phone: "", category: categories[0], notes: "" });
      hapticSuccess();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to submit report.");
      hapticError();
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: WellbeingReport["status"]) => {
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
    }
  };

  const filteredReports = canManageReports ? activeReports : activeReports.filter((r) => r.status !== "resolved").slice(0, 3);

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
        <section className="ops-panel">
          <div className="section-heading">
            <h3>Welfare dashboard</h3>
            <span>{activeReports.filter((r) => r.status !== "resolved").length} active</span>
          </div>
          {loadingReports ? (
            <div className="skeleton-page" />
          ) : filteredReports.length === 0 ? (
            <EmptyState icon={HeartPulse} title="No reports" body="Submitted reports will appear here." />
          ) : (
            <div className="report-list">
              {filteredReports.map((report, index) => (
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
                    {(["responded", "resolved", "escalated"] as WellbeingReport["status"][]).map((status) => (
                      <button key={status} type="button" onClick={() => handleStatusUpdate(report.id, status)}>
                        {status}
                      </button>
                    ))}
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      )}

      {!canManageReports && filteredReports.length > 0 && (
        <section className="ops-panel">
          <div className="section-heading">
            <h3>Your reports</h3>
            <span>{filteredReports.length}</span>
          </div>
          <div className="report-list">
            {filteredReports.map((report, index) => (
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
      {!canManageReports && filteredReports.length === 0 && (
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
