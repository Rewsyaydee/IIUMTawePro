import { FormEvent, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { BUREAUS, roleLabels } from "../constants";
import { redeemAccessCode, shouldUseApiAuth } from "../lib/apiAuth";
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

  if (user.role !== "student") {
    return null;
  }

  const submitAccessCode = async (event: FormEvent) => {
    event.preventDefault();
    const displayName = form.name.trim() || "Committee User";
    setSubmitting(true);
    setMessage("");

    try {
      if (shouldUseApiAuth()) {
        const result = await redeemAccessCode({
          code: form.code,
          displayName,
          selectedRole: form.role,
          selectedBureau: form.bureau
        });
        const next = addMockUser({
          name: result.user.name,
          telegramId: result.user.telegramId,
          role: result.user.role,
          bureau: result.user.bureau
        });
        setUserId(next.id);
        hapticSuccess();
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
      setUserId(next.id);
      hapticSuccess();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to unlock committee mode.");
      hapticError();
    } finally {
      setSubmitting(false);
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
      <button className="primary-button full-width" type="submit" disabled={submitting}>
        <ShieldCheck size={16} aria-hidden="true" />
        <span>{submitting ? "Checking code..." : "Unlock committee mode"}</span>
      </button>
    </form>
  );
}
