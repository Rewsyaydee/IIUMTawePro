import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Camera, Send, ShieldCheck, XCircle } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { hapticError, hapticImpact, hapticSuccess } from "../lib/telegram";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function Attendance() {
  const { user } = useMockUser();
  const { attendanceProofs, submitAttendanceProof, reviewAttendanceProof } = useMockData();
  const [selfieDataUrl, setSelfieDataUrl] = useState("");
  const [latestStatus, setLatestStatus] = useState("");
  const today = todayKey();
  const isCommittee = user.role === "committee" || user.role === "head";
  const isSpecialTask = user.bureau === "Special Task";
  const isMainboard = user.role === "mainboard";

  const ownProof = useMemo(
    () => attendanceProofs.find((proof) => proof.userId === user.id && proof.date === today),
    [attendanceProofs, today, user.id]
  );
  const pendingReview = attendanceProofs.filter((proof) => proof.status === "pending_review");
  const sentToMainboard = attendanceProofs.filter((proof) => proof.status === "sent_to_mainboard");

  const handleSelfieChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelfieDataUrl("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setSelfieDataUrl(String(reader.result || ""));
    reader.onerror = () => hapticError();
    reader.readAsDataURL(file);
  };

  const submitProof = (event: FormEvent) => {
    event.preventDefault();
    if (!selfieDataUrl || ownProof || !user.bureau) {
      hapticError();
      return;
    }

    submitAttendanceProof({ selfieDataUrl });
    setSelfieDataUrl("");
    setLatestStatus("Proof sent to Special Task review.");
    hapticSuccess();
  };

  const reviewProof = (id: string, status: "sent_to_mainboard" | "rejected") => {
    reviewAttendanceProof(id, status);
    hapticImpact(status === "sent_to_mainboard" ? "medium" : "light");
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Daily proof</p>
          <h2>Committee Punch Card</h2>
        </div>
        <span className="soft-chip">{today}</span>
      </div>

      {isCommittee && (
        <form className="attendance-panel" onSubmit={submitProof}>
          <div className="attendance-copy">
            <div>
              <p className="eyebrow">My attendance</p>
              <h3>{ownProof ? "Submitted today" : "Selfie punch card"}</h3>
              <p>{ownProof ? "Special Task will review this proof." : "One proof is required for today."}</p>
            </div>
            {ownProof && <StatusBadge value={ownProof.status} />}
          </div>

          <label className={selfieDataUrl || ownProof ? "selfie-preview has-image" : "selfie-preview"}>
            {selfieDataUrl || ownProof ? (
              <img src={selfieDataUrl || ownProof?.selfieDataUrl} alt="Attendance selfie proof" />
            ) : (
              <span>
                <Camera size={28} aria-hidden="true" />
                <strong>Selfie proof</strong>
              </span>
            )}
            <input type="file" accept="image/*" capture="user" required={!ownProof} onChange={handleSelfieChange} disabled={Boolean(ownProof)} />
          </label>

          <button className="punch-button" type="submit" disabled={!selfieDataUrl || Boolean(ownProof)}>
            <Send size={20} aria-hidden="true" />
            <span>{ownProof ? "Proof submitted" : "Send proof"}</span>
          </button>
          {latestStatus && <p className="success-note">{latestStatus}</p>}
        </form>
      )}

      {isSpecialTask && (
        <section className="ops-panel">
          <div className="section-heading">
            <h3>Special Task Review</h3>
            <span>{pendingReview.length} pending</span>
          </div>
          {pendingReview.length === 0 ? (
            <EmptyState icon={BadgeCheck} title="Review queue clear" body="New proof submissions will appear here." />
          ) : (
            <div className="attendance-review-list">
              {pendingReview.map((proof, index) => (
                <motion.article
                  className="attendance-review-card"
                  key={proof.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <img src={proof.selfieDataUrl} alt={`${proof.committeeName} attendance selfie`} />
                  <div>
                    <div className="report-title">
                      <strong>{proof.committeeName}</strong>
                      <StatusBadge value={proof.status} />
                    </div>
                    <p>
                      {proof.bureau} - {new Date(proof.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="review-actions">
                      <button type="button" className="danger-outline-button" onClick={() => reviewProof(proof.id, "rejected")}>
                        <XCircle size={16} aria-hidden="true" />
                        <span>Reject</span>
                      </button>
                      <button type="button" className="verify-button" onClick={() => reviewProof(proof.id, "sent_to_mainboard")}>
                        <ShieldCheck size={16} aria-hidden="true" />
                        <span>Verify & send</span>
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      )}

      {isMainboard && (
        <section className="ops-panel">
          <div className="section-heading">
            <h3>Mainboard Attendance</h3>
            <span>{sentToMainboard.length} verified</span>
          </div>
          {sentToMainboard.length === 0 ? (
            <EmptyState icon={BadgeCheck} title="No verified records" body="Special Task approved proofs will appear here." />
          ) : (
            <div className="attendance-review-list compact-list">
              {sentToMainboard.map((proof) => (
                <article className="attendance-review-card" key={proof.id}>
                  <img src={proof.selfieDataUrl} alt={`${proof.committeeName} verified attendance selfie`} />
                  <div>
                    <div className="report-title">
                      <strong>{proof.committeeName}</strong>
                      <StatusBadge value={proof.status} />
                    </div>
                    <p>{proof.bureau}</p>
                    <p className="muted">
                      Verified by {proof.reviewedBy || "Special Task"} at{" "}
                      {proof.reviewedAt ? new Date(proof.reviewedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {!isCommittee && !isSpecialTask && !isMainboard && (
        <EmptyState icon={Camera} title="Committee area" body="Daily punch card is available to committee members." />
      )}
    </section>
  );
}

export default Attendance;
