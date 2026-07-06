import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { HeartPulse, ShieldCheck } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { hapticSuccess } from "../lib/telegram";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { WellbeingReport } from "../types";

const categories = ["Dizzy", "Injury", "Lost group", "Medication", "Anxiety", "Other"];

function Wellbeing() {
  const { user } = useMockUser();
  const { reports, addReport, updateReportStatus } = useMockData();
  const [form, setForm] = useState({
    studentName: "",
    phone: "",
    category: categories[0],
    notes: ""
  });
  const [latestReference, setLatestReference] = useState("");

  const canManageReports = user.role === "mainboard" || user.bureau === "Welfare";

  const submitReport = (event: FormEvent) => {
    event.preventDefault();
    const report = addReport(form);
    setLatestReference(report.reference);
    setForm({ studentName: "", phone: "", category: categories[0], notes: "" });
    hapticSuccess();
  };

  const activeReports = reports.filter((report) => report.status !== "resolved");

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Safety</p>
          <h2>Wellbeing</h2>
        </div>
        <span className="soft-chip">Mock backend proxy</span>
      </div>

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
            onChange={(event) => setForm((current) => ({ ...current, studentName: event.target.value }))}
          />
        </label>
        <label>
          <span>Phone</span>
          <input value={form.phone} required onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
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
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </label>
        <button className="primary-button full-width" type="submit">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Submit report</span>
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
            <span>{activeReports.length} active</span>
          </div>
          {reports.length === 0 ? (
            <EmptyState icon={HeartPulse} title="No reports" body="Submitted reports will appear here." />
          ) : (
            <div className="report-list">
              {reports.map((report, index) => (
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
                      <button key={status} type="button" onClick={() => updateReportStatus(report.id, status)}>
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
    </section>
  );
}

export default Wellbeing;
