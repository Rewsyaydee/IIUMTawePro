import { FormEvent, useState } from "react";
import { createPortal } from "react-dom";
import { GraduationCap, IdCard } from "lucide-react";
import { hapticSuccess } from "../lib/telegram";
import { onboardStudent } from "../lib/studentAttendanceApi";
import { shouldUseApiAuth } from "../lib/apiAuth";
import { useMockUser } from "../state/MockUserContext";

const kulliyyahs = [
  "KICT", "KOE", "KENMS", "KOED", "AIKOL", "KAED", "AHAS KIRKHS"
];

type OnboardingModalProps = {
  onComplete: () => void;
};

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { user, updateMockUser } = useMockUser();
  const [matric, setMatric] = useState("");
  const [kulliyyah, setKulliyyah] = useState(kulliyyahs[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const apiMode = shouldUseApiAuth();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!matric.trim()) {
      setError("Please enter your matric number.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      if (apiMode) {
        await onboardStudent(matric.trim(), kulliyyah);
      }
      updateMockUser(user.id, {
        matricNumber: matric.trim(),
        kulliyyah
      });
      hapticSuccess();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save details.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="onboarding-overlay">
      <form className="onboarding-card" onSubmit={submit}>
        <div className="onboarding-icon">
          <GraduationCap size={32} />
        </div>
        <h2>Welcome to Ta'aruf Week</h2>
        <p>Please enter your details to get started. This is required to track your event attendance.</p>

        <label>
          <span><IdCard size={14} /> Matric Number</span>
          <input
            value={matric}
            placeholder="e.g., 2212345"
            required
            onChange={(e) => setMatric(e.target.value)}
          />
        </label>

        <label>
          <span><GraduationCap size={14} /> Kulliyyah</span>
          <select value={kulliyyah} onChange={(e) => setKulliyyah(e.target.value)}>
            {kulliyyahs.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>

        {error && <p className="access-error">{error}</p>}

        <button className="primary-button full-width" type="submit" disabled={submitting}>
          <span>{submitting ? "Saving..." : "Continue"}</span>
        </button>
      </form>
    </div>,
    document.body
  );
}
