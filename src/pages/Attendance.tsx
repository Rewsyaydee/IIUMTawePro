import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Camera, Send, ShieldCheck, XCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { ThinkingOrb } from "thinking-orbs";
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
import type { AttendanceProof, ClockType, CommitteeDailyStatus } from "../types";
import { getClockWindowMessage, getDailyAttendanceStatus, isWithinClockInWindow, isWithinClockOutWindow } from "../lib/attendanceTime";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function Attendance() {
  const { user } = useMockUser();
  const { attendanceProofs, submitAttendanceProof, reviewAttendanceProof } = useMockData();
  const location = useLocation();
  const checkInState = (location.state as { blockLabel: string; blockId: string; venueCodes: string[] } | null) || null;
  const apiMode = shouldUseApiAuth();
  const [remoteProofs, setRemoteProofs] = useState<AttendanceProof[]>([]);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [authRefreshTick, setAuthRefreshTick] = useState(0);
  const [selfieDataUrl, setSelfieDataUrl] = useState("");
  const [clockOutSelfie, setClockOutSelfie] = useState("");
  const [latestStatus, setLatestStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeClockType, setActiveClockType] = useState<ClockType>("clock-in");
  const [rejectionForm, setRejectionForm] = useState<{ proofId: string; reason: string } | null>(null);
  const today = todayKey();
  const isCommittee = user.role === "committee" || user.role === "head";
  const isSpecialTask = user.bureau === "Special Task";
  const isMainboard = user.role === "mainboard";
  const activeProofs = apiMode ? remoteProofs : attendanceProofs;
  const isAndroid = useMemo(() => /android/i.test(navigator.userAgent), []);
  const captureAttr = isAndroid ? "environment" : "user";

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

  const clockWindow = useMemo(() => {
    const now = new Date();
    return {
      ...getClockWindowMessage(now),
      isClockInOpen: isWithinClockInWindow(now),
      isClockOutOpen: isWithinClockOutWindow(now)
    };
  }, []);

  const ownClockInProof = useMemo(
    () => activeProofs.find((proof) => proof.userId === user.id && proof.date === today && proof.clockType === "clock-in"),
    [activeProofs, today, user.id]
  );
  const ownClockOutProof = useMemo(
    () => activeProofs.find((proof) => proof.userId === user.id && proof.date === today && proof.clockType === "clock-out"),
    [activeProofs, today, user.id]
  );

  const clockInSubmitted = Boolean(ownClockInProof);
  const clockOutSubmitted = Boolean(ownClockOutProof);
  const clockInLocked = Boolean(ownClockInProof && ownClockInProof.status !== "rejected");
  const clockOutLocked = Boolean(ownClockOutProof && ownClockOutProof.status !== "rejected");
  const canResubmitClockIn = ownClockInProof?.status === "rejected";
  const canResubmitClockOut = ownClockOutProof?.status === "rejected";

  const dailyStatus: CommitteeDailyStatus = useMemo(
    () => getDailyAttendanceStatus(clockInSubmitted, clockOutSubmitted),
    [clockInSubmitted, clockOutSubmitted]
  );

  const pendingReview = activeProofs.filter((proof) => proof.status === "pending_review");
  const sentToMainboard = activeProofs.filter((proof) => proof.status === "sent_to_mainboard");

  const handleSelfieChange = (event: ChangeEvent<HTMLInputElement>, clockType: ClockType) => {
    const file = event.target.files?.[0];
    if (!file) {
      if (clockType === "clock-in") setSelfieDataUrl("");
      else setClockOutSelfie("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (clockType === "clock-in") setSelfieDataUrl(result);
      else setClockOutSelfie(result);
    };
    reader.onerror = () => hapticError();
    reader.readAsDataURL(file);
  };

  const submitProof = async (event: FormEvent, clockType: ClockType) => {
    event.preventDefault();
    const selfie = clockType === "clock-in" ? selfieDataUrl : clockOutSelfie;
    const locked = clockType === "clock-in" ? clockInLocked : clockOutLocked;

    if (!selfie || locked || !user.bureau || isSubmitting) {
      hapticError();
      return;
    }

    const now = new Date();
    const inWindow =
      clockType === "clock-in" ? isWithinClockInWindow(now) : isWithinClockOutWindow(now);

    if (!inWindow) {
      const label = clockType === "clock-in" ? "8:00 AM – 8:30 AM" : "5:00 PM – 5:30 PM";
      setErrorMessage(`${clockType === "clock-in" ? "Clock-in" : "Clock-out"} window is currently closed. Valid hours: ${label}.`);
      hapticError();
      return;
    }

    setIsSubmitting(true);
    setActiveClockType(clockType);
    try {
      setErrorMessage("");
      if (apiMode) {
        const proof = await submitAttendanceProofApi(selfie, clockType);
        mergeRemoteProof(proof);
      } else {
        submitAttendanceProof({ selfieDataUrl: selfie, clockType });
      }
      if (clockType === "clock-in") setSelfieDataUrl("");
      else setClockOutSelfie("");
      setLatestStatus(`${clockType === "clock-in" ? "Clock-in" : "Clock-out"} proof sent to Special Task review.`);
      hapticSuccess();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit attendance proof.");
      hapticError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const reviewProof = async (id: string, status: "sent_to_mainboard" | "rejected", rejectionReason?: string) => {
    try {
      setErrorMessage("");
      if (apiMode) {
        const proof = await reviewAttendanceProofApi(id, status, rejectionReason);
        mergeRemoteProof(proof);
      } else {
        reviewAttendanceProof(id, status, rejectionReason);
      }
      setRejectionForm(null);
      hapticImpact(status === "sent_to_mainboard" ? "medium" : "light");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to review attendance proof.");
      hapticError();
    }
  };

  return (
    <section className="page-stack">
      {user.role === "student" ? (
        <StudentAttendanceView checkInState={checkInState} />
      ) : (
        <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Daily attendance</p>
          <h2>Committee Punch Card</h2>
        </div>
        <span className="soft-chip">{today}</span>
      </div>

      {isCommittee && (
        <>
          <div className={`time-status-bar ${clockWindow.window}`}>
            <div className="time-status-left">
              <span className={`time-status-badge ${clockWindow.isClockInOpen || clockWindow.isClockOutOpen ? "open" : "closed"}`}>
                {clockWindow.isClockInOpen || clockWindow.isClockOutOpen ? "OPEN" : "CLOSED"}
              </span>
              <div>
                <strong>{clockWindow.header}</strong>
                <p>{clockWindow.subtext}</p>
              </div>
            </div>
            {dailyStatus !== "pending" && (
              <span className={`daily-status-chip ${dailyStatus}`}>
                {dailyStatus.toUpperCase()}
              </span>
            )}
          </div>

          <form className="attendance-panel" onSubmit={(e) => submitProof(e, "clock-in")}>
            <div className="attendance-copy">
              <div>
                <p className="eyebrow">Morning check</p>
                <h3>Clock In — 8:00 – 8:30 AM</h3>
                <p>
                  {clockInLocked
                    ? "Clock-in submitted. Waiting for Special Task review."
                    : canResubmitClockIn
                      ? "Your clock-in was rejected. Submit a fresh selfie."
                      : clockWindow.isClockInOpen
                        ? "Take a selfie and submit before the window closes."
                        : "Clock-in window is currently closed."}
                </p>
              </div>
              {ownClockInProof && <StatusBadge value={ownClockInProof.status} />}
            </div>

            <label className={selfieDataUrl || ownClockInProof ? "selfie-preview has-image" : "selfie-preview"}>
              {selfieDataUrl || ownClockInProof ? (
                <img src={selfieDataUrl || ownClockInProof?.selfieDataUrl} alt="Clock-in selfie" />
              ) : (
                <span>
                  <Camera size={28} aria-hidden="true" />
                  <strong>Clock-in selfie</strong>
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                capture={captureAttr}
                required={!clockInLocked}
                onChange={(e) => handleSelfieChange(e, "clock-in")}
                disabled={clockInLocked}
              />
            </label>

            <button
              className="punch-button"
              type="submit"
              disabled={!clockWindow.isClockInOpen || !selfieDataUrl || clockInLocked || isSubmitting}
            >
              {isSubmitting && activeClockType === "clock-in" ? (
                <ThinkingOrb state="solving" size={20} />
              ) : (
                <>
                  <Send size={20} aria-hidden="true" />
                  <span>
                    {clockInLocked ? "Clock-in submitted" : canResubmitClockIn ? "Resend clock-in" : "Submit clock-in"}
                  </span>
                </>
              )}
            </button>
          </form>

          <form className="attendance-panel" onSubmit={(e) => submitProof(e, "clock-out")}>
            <div className="attendance-copy">
              <div>
                <p className="eyebrow">Evening check</p>
                <h3>Clock Out — 5:00 – 5:30 PM</h3>
                <p>
                  {clockOutLocked
                    ? "Clock-out submitted. Waiting for Special Task review."
                    : canResubmitClockOut
                      ? "Your clock-out was rejected. Submit a fresh selfie."
                      : clockWindow.isClockOutOpen
                        ? "Take a selfie and submit before the window closes."
                        : "Clock-out window is currently closed."}
                </p>
              </div>
              {ownClockOutProof && <StatusBadge value={ownClockOutProof.status} />}
            </div>

            <label className={clockOutSelfie || ownClockOutProof ? "selfie-preview has-image" : "selfie-preview"}>
              {clockOutSelfie || ownClockOutProof ? (
                <img src={clockOutSelfie || ownClockOutProof?.selfieDataUrl} alt="Clock-out selfie" />
              ) : (
                <span>
                  <Camera size={28} aria-hidden="true" />
                  <strong>Clock-out selfie</strong>
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                capture={captureAttr}
                required={!clockOutLocked}
                onChange={(e) => handleSelfieChange(e, "clock-out")}
                disabled={clockOutLocked}
              />
            </label>

            <button
              className="punch-button"
              type="submit"
              disabled={!clockWindow.isClockOutOpen || !clockOutSelfie || clockOutLocked || isSubmitting}
            >
              {isSubmitting && activeClockType === "clock-out" ? (
                <ThinkingOrb state="solving" size={20} />
              ) : (
                <>
                  <Send size={20} aria-hidden="true" />
                  <span>
                    {clockOutLocked ? "Clock-out submitted" : canResubmitClockOut ? "Resend clock-out" : "Submit clock-out"}
                  </span>
                </>
              )}
            </button>
          </form>

          {errorMessage && <p className="access-error">{errorMessage}</p>}
          {latestStatus && <p className="success-note">{latestStatus}</p>}
        </>
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
                      {proof.clockType && (
                        <span className={`clock-type-chip ${proof.clockType}`}>{proof.clockType === "clock-in" ? "Clock In" : "Clock Out"}</span>
                      )}
                      {proof.bureau} - {new Date(proof.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="review-actions">
                      {rejectionForm?.proofId === proof.id ? (
                        <div className="rejection-form">
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Reason (e.g. blurry, wrong person)..."
                            value={rejectionForm.reason}
                            onChange={(e) => setRejectionForm({ ...rejectionForm, reason: e.target.value })}
                            autoFocus
                          />
                          <div className="rejection-form-actions">
                            <button type="button" className="outline-button" onClick={() => setRejectionForm(null)}>
                              Cancel
                            </button>
                            <button type="button" className="danger-outline-button" onClick={() => reviewProof(proof.id, "rejected", rejectionForm.reason || undefined)}>
                              Confirm Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button type="button" className="danger-outline-button" onClick={() => setRejectionForm({ proofId: proof.id, reason: "" })}>
                            <XCircle size={16} aria-hidden="true" />
                            <span>Reject</span>
                          </button>
                          <button type="button" className="verify-button" onClick={() => reviewProof(proof.id, "sent_to_mainboard")}>
                            <ShieldCheck size={16} aria-hidden="true" />
                            <span>Verify & send</span>
                          </button>
                        </>
                      )}
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
