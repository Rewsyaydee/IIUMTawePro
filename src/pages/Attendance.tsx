import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Camera, Send, ShieldCheck, XCircle } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { StudentAttendanceView } from "../components/StudentAttendanceView";
import {
  listAttendanceProofs,
  reviewAttendanceProof as reviewAttendanceProofApi,
  submitAttendanceProof as submitAttendanceProofApi
} from "../lib/attendanceApi";
import { authSessionChangedEvent, shouldUseApiAuth } from "../lib/apiAuth";
import { hapticError, hapticImpact, hapticSuccess } from "../lib/telegram";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { AttendanceProof } from "../types";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function Attendance() {
  const { user } = useMockUser();
  const { attendanceProofs, submitAttendanceProof, reviewAttendanceProof } = useMockData();
  const apiMode = shouldUseApiAuth();
  const [remoteProofs, setRemoteProofs] = useState<AttendanceProof[]>([]);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [authRefreshTick, setAuthRefreshTick] = useState(0);
  const [selfieDataUrl, setSelfieDataUrl] = useState("");
  const [latestStatus, setLatestStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const today = todayKey();
  const isCommittee = user.role === "committee" || user.role === "head";
  const isSpecialTask = user.bureau === "Special Task";
  const isMainboard = user.role === "mainboard";
  const activeProofs = apiMode ? remoteProofs : attendanceProofs;

  useEffect(() => {
    const handleSessionChanged = () => setAuthRefreshTick((value) => value + 1);
    window.addEventListener(authSessionChangedEvent, handleSessionChanged);
    return () => window.removeEventListener(authSessionChangedEvent, handleSessionChanged);
  }, []);

  useEffect(() => {
    if (!apiMode || user.role === "student") return;

    let cancelled = false;
    setLoadingProofs(true);
    setErrorMessage("");
    listAttendanceProofs()
      .then((proofs) => {
        if (!cancelled) setRemoteProofs(proofs);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load attendance proofs.");
          hapticError();
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProofs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, user.id, user.role, user.bureau, authRefreshTick]);

  const mergeRemoteProof = (proof: AttendanceProof) => {
    setRemoteProofs((items) => [proof, ...items.filter((item) => item.id !== proof.id)]);
  };

  const ownProof = useMemo(
    () => activeProofs.find((proof) => proof.userId === user.id && proof.date === today),
    [activeProofs, today, user.id]
  );
  const proofLocked = Boolean(ownProof && ownProof.status !== "rejected");
  const canResubmit = ownProof?.status === "rejected";
  const pendingReview = activeProofs.filter((proof) => proof.status === "pending_review");
  const sentToMainboard = activeProofs.filter((proof) => proof.status === "sent_to_mainboard");

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

  const submitProof = async (event: FormEvent) => {
    event.preventDefault();
    if (!selfieDataUrl || proofLocked || !user.bureau) {
      hapticError();
      return;
    }

    try {
      setErrorMessage("");
      if (apiMode) {
        const proof = await submitAttendanceProofApi(selfieDataUrl);
        mergeRemoteProof(proof);
      } else {
        submitAttendanceProof({ selfieDataUrl });
      }
      setSelfieDataUrl("");
      setLatestStatus("Proof sent to Special Task review.");
      hapticSuccess();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit attendance proof.");
      hapticError();
    }
  };

  const reviewProof = async (id: string, status: "sent_to_mainboard" | "rejected") => {
    try {
      setErrorMessage("");
      if (apiMode) {
        const proof = await reviewAttendanceProofApi(id, status);
        mergeRemoteProof(proof);
      } else {
        reviewAttendanceProof(id, status);
      }
      hapticImpact(status === "sent_to_mainboard" ? "medium" : "light");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to review attendance proof.");
      hapticError();
    }
  };

  return (
    <section className="page-stack">
      {user.role === "student" ? (
        <StudentAttendanceView />
      ) : (
        <>
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
              <h3>{proofLocked ? "Submitted today" : canResubmit ? "Submit new proof" : "Selfie punch card"}</h3>
              <p>
                {proofLocked
                  ? "Special Task will review this proof."
                  : canResubmit
                    ? "Your previous proof was rejected. Send a fresh selfie."
                    : "One proof is required for today."}
              </p>
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
            <input type="file" accept="image/*" capture="user" required={!proofLocked} onChange={handleSelfieChange} disabled={proofLocked} />
          </label>

          <button className="punch-button" type="submit" disabled={!selfieDataUrl || proofLocked}>
            <Send size={20} aria-hidden="true" />
            <span>{proofLocked ? "Proof submitted" : canResubmit ? "Resend proof" : "Send proof"}</span>
          </button>
          {errorMessage && <p className="access-error">{errorMessage}</p>}
          {latestStatus && <p className="success-note">{latestStatus}</p>}
        </form>
      )}

      {isSpecialTask && (
        <section className="ops-panel">
          <div className="section-heading">
            <h3>Special Task Review</h3>
            <span>{loadingProofs ? "loading" : `${pendingReview.length} pending`}</span>
          </div>
          {errorMessage && <p className="access-error">{errorMessage}</p>}
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
            <span>{loadingProofs ? "loading" : `${sentToMainboard.length} verified`}</span>
          </div>
          {errorMessage && <p className="access-error">{errorMessage}</p>}
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
        </>
      )}
    </section>
  );
}

export default Attendance;
