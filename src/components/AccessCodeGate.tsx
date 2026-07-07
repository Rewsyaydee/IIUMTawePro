import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { KeyRound, ShieldCheck } from "lucide-react";
import { BUREAUS, roleLabels } from "../constants";
import { isTelegramAvailable, redeemAccessCode, shouldUseApiAuth } from "../lib/apiAuth";
import { hapticError, hapticSuccess } from "../lib/telegram";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { Bureau, Role } from "../types";

const allowedRoles: Role[] = ["committee", "head"];

type AccessCodeGateProps = {
  compact?: boolean;
};

export function AccessCodeGate({ compact = false }: AccessCodeGateProps) {
  const { user, addMockUser, setUserId } = useMockUser();
  const { redeemInviteCode } = useMockData();
  const [form, setForm] = useState({
    name: "",
    code: "",
    role: "committee" as Role,
    bureau: "Catering" as Bureau
  });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const unlockTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(unlockTimer.current), []);

  if (user.role !== "student") {
    return null;
  }

  const submitAccessCode = async (event: FormEvent) => {
    event.preventDefault();
    const displayName = form.name.trim() || "Committee User";
    setSubmitting(true);
    setMessage("");
    let unlockStarted = false;

    const finishUnlock = (nextId: string) => {
      unlockStarted = true;
      setUnlocking(true);
      hapticSuccess();
      unlockTimer.current = window.setTimeout(() => setUserId(nextId), 1280);
    };

    try {
      const useApiPath = shouldUseApiAuth() && isTelegramAvailable();

      if (useApiPath) {
        const result = await redeemAccessCode({
          code: form.code,
          displayName,
          selectedRole: form.role,
          selectedBureau: form.bureau
        });
        const next = addMockUser({
          id: result.user.id,
          name: result.user.name,
          telegramId: result.user.telegramId,
          role: result.user.role,
          bureau: result.user.bureau
        });
        finishUnlock(next.id);
        return;
      }

      const invite = redeemInviteCode(form.code, displayName);
      if (!invite) {
        setMessage("Code not recognised or already used.");
        hapticError();
        return;
      }

      const selectedRole = invite.isReusable && invite.role === "committee" ? form.role : invite.role;
      const next = addMockUser({
        name: displayName,
        role: selectedRole,
        bureau: selectedRole === "mainboard" ? undefined : invite.bureau || form.bureau
      });
      finishUnlock(next.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to unlock committee mode.");
      hapticError();
    } finally {
      if (!unlockStarted) setSubmitting(false);
    }
  };

  return (
    <form className={compact ? "access-card access-card-compact" : "access-card"} onSubmit={submitAccessCode}>
      <div className="access-card-copy">
        <span className="tile-icon amber">
          <KeyRound size={18} aria-hidden="true" />
        </span>
        <div>
          <strong>Committee access</strong>
          <p>{compact ? "Unlock committee workspace with the manual code." : "Students enter as guests. Committee members unlock their workspace with a manual code."}</p>
        </div>
      </div>
      <div className="access-grid">
        <label>
          <span>Name</span>
          <input
            value={form.name}
            placeholder="Your committee name"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <label>
          <span>Access code</span>
          <input
            value={form.code}
            placeholder="OiAkuNakTaweNi"
            required
            onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
          />
        </label>
        <label>
          <span>Role</span>
          <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as Role }))}>
            {allowedRoles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Bureau</span>
          <select value={form.bureau} onChange={(event) => setForm((current) => ({ ...current, bureau: event.target.value as Bureau }))}>
            {BUREAUS.map((bureau) => (
              <option key={bureau} value={bureau}>
                {bureau}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message && <p className="access-error">{message}</p>}
      <button className="primary-button full-width" type="submit" disabled={submitting || unlocking}>
        <ShieldCheck size={16} aria-hidden="true" />
        <span>{unlocking ? "Access unlocked..." : submitting ? "Checking code..." : "Unlock committee mode"}</span>
      </button>
      {unlocking &&
        createPortal(
          <div className="unlock-overlay" aria-live="polite">
            <div className="unlock-overlay-content">
              <div className="unlock-lock" aria-hidden="true">
                <span className="unlock-shackle" />
                <span className="unlock-body">
                  <KeyRound size={24} />
                </span>
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="unlock-overlay-copy">
                <strong>Access unlocked</strong>
                <span>
                  {roleLabels[form.role]} {form.bureau ? `- ${form.bureau}` : ""} workspace
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </form>
  );
}
