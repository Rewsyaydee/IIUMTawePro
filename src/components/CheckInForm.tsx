import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, MapPin, Loader2, AlertCircle } from "lucide-react";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import { shouldUseApiAuth } from "../lib/apiAuth";
import { submitStudentAttendance as apiSubmit } from "../lib/studentAttendanceApi";
import { getCurrentPosition, isWithinRadius, type Coordinates } from "../lib/locationVerify";
import { getVenue } from "../features/navigation/data/venues";
import { hapticError, hapticSuccess } from "../lib/telegram";

type GpsStatus = "idle" | "scanning" | "success" | "failed";

type CheckInFormProps = {
  blockLabel: string;
  blockId: string;
  venueCodes: string[];
  onDone?: () => void;
};

export function CheckInForm({ blockLabel, blockId, venueCodes, onDone }: CheckInFormProps) {
  const { user } = useMockUser();
  const { submitStudentAttendance } = useMockData();
  const apiMode = shouldUseApiAuth();

  const [fullName, setFullName] = useState(user.name || "");
  const [matricNumber, setMatricNumber] = useState(user.matricNumber || "");
  const [kulliyyah, setKulliyyah] = useState(user.kulliyyah || "");
  const [note, setNote] = useState("");
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [gpsCoords, setGpsCoords] = useState<Coordinates | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const venueCoords = venueCodes
    .map((code) => getVenue(code))
    .filter((v) => v && v.lat && v.lng)
    .map((v) => ({ lat: v!.lat!, lng: v!.lng! }));

  const noGpsNeeded = venueCoords.length === 0;

  const handleVerifyLocation = async () => {
    setGpsStatus("scanning");
    setError("");
    try {
      const pos = await getCurrentPosition();
      setGpsCoords(pos);
      if (noGpsNeeded) {
        setGpsStatus("success");
        hapticSuccess();
        return;
      }
      const withinRange = venueCoords.some((vc) => isWithinRadius(pos, vc, 200));
      if (withinRange) {
        setGpsStatus("success");
        hapticSuccess();
      } else {
        setGpsStatus("failed");
        hapticError();
      }
    } catch (err) {
      setGpsStatus("failed");
      setError(err instanceof Error ? err.message : "Location access failed.");
      hapticError();
    }
  };

  const canSubmit = (gpsStatus === "success" || noGpsNeeded) && fullName.trim() && matricNumber.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const lat = gpsCoords?.lat || 0;
      const lng = gpsCoords?.lng || 0;

      if (apiMode) {
        await apiSubmit({
          scheduleItemId: blockId,
          eventTitle: blockLabel,
          studentName: fullName,
          matricNumber,
          kulliyyah,
          latitude: lat,
          longitude: lng,
          status: "present"
        });
      } else {
        submitStudentAttendance({
          blockId,
          blockLabel,
          studentName: fullName,
          matricNumber,
          kulliyyah,
          latitude: lat,
          longitude: lng,
          note: note.trim() || undefined
        });
      }
      hapticSuccess();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit.");
      hapticError();
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <motion.div
        className="check-in-form glass-card"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="check-in-success">
          <CheckCircle2 size={48} color="var(--gold-accent)" />
          <h3>Check-In Successful</h3>
          <p>Your attendance for <strong>{blockLabel}</strong> has been recorded.</p>
          {onDone && (
            <button className="check-in-submit" onClick={onDone}>
              Back to Schedule
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="check-in-form glass-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="check-in-form-header">Check-In: {blockLabel}</h3>

      <div className="check-in-form-field">
        <label>Full Name</label>
        <input
          className="check-in-form-input"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g., Haziq"
        />
      </div>

      <div className="check-in-form-field">
        <label>Matric Number</label>
        <input
          className="check-in-form-input"
          type="text"
          value={matricNumber}
          onChange={(e) => setMatricNumber(e.target.value)}
          placeholder="e.g., 2310467"
        />
      </div>

      <div className="check-in-form-field">
        <label>Kulliyyah</label>
        <input
          className="check-in-form-input"
          type="text"
          value={kulliyyah}
          onChange={(e) => setKulliyyah(e.target.value)}
          placeholder="e.g., KAED"
        />
      </div>

      <div className="check-in-form-field">
        <label>Short Note (Optional)</label>
        <textarea
          className="check-in-form-textarea"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Briefly note what you learned..."
        />
      </div>

      <div className="gps-validator">
        <div className="gps-validator-header">
          <MapPin size={16} />
          <span>Location Verification</span>
        </div>
        {gpsStatus === "idle" && (
          <button className="gps-verify-btn" onClick={handleVerifyLocation}>
            Verify Location
          </button>
        )}
        {gpsStatus === "scanning" && (
          <div className="gps-validator-status scanning">
            <Loader2 size={18} className="gps-spinner" />
            <span>Verifying Location...</span>
          </div>
        )}
        {gpsStatus === "success" && (
          <div className="gps-validator-status success">
            <CheckCircle2 size={18} />
            <span>Location Verified (Within 200m)</span>
          </div>
        )}
        {gpsStatus === "failed" && (
          <div className="gps-validator-status failed">
            <AlertCircle size={18} />
            <span>{error || "Out of Range. You must be at the venue to check in."}</span>
            <button className="gps-retry-btn" onClick={handleVerifyLocation}>Retry</button>
          </div>
        )}
      </div>

      {error && gpsStatus !== "failed" && <p className="access-error">{error}</p>}

      <button
        className="check-in-submit"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {submitting ? "Submitting..." : "Submit Check-In"}
      </button>
    </motion.div>
  );
}
