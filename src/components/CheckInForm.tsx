import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, MapPin, Loader2, AlertCircle, Send } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import { shouldUseApiAuth } from "../lib/apiAuth";
import { submitStudentAttendance as apiSubmit } from "../lib/studentAttendanceApi";
import { getCurrentPosition, isWithinRadius, type Coordinates } from "../lib/locationVerify";
import { getVenue } from "../features/navigation/data/venues";
import { hapticError, hapticSuccess } from "../lib/telegram";
import { shareToChat } from "../lib/shareToStory";

const OFFLINE_QUEUE_KEY = "tawe_offline_checkins";

type OfflineEntry = {
  scheduleItemId: string;
  eventTitle: string;
  studentName: string;
  matricNumber: string;
  kulliyyah: string;
  latitude: number;
  longitude: number;
  savedAt: number;
};

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
  const [sharingCheckIn, setSharingCheckIn] = useState(false);

  const handleShareCheckIn = async () => {
    const { renderCheckInCard } = await import("../lib/shareTemplates");
    const blob = await renderCheckInCard({
      username: user.name.split(" ")[0],
      eventTitle: blockLabel,
      venue: getVenue(venueCodes[0])?.name || "IIUM Campus",
      time: new Date().toLocaleString("en-MY", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }),
      lat: gpsCoords?.lat || 0,
      lng: gpsCoords?.lng || 0
    });
    if (!blob) return;
    setSharingCheckIn(true);
    await shareToChat(blob);
    setSharingCheckIn(false);
  };

  const venueCoords = venueCodes
    .map((code) => getVenue(code))
    .filter((v) => v && v.lat && v.lng)
    .map((v) => ({ lat: v!.lat!, lng: v!.lng! }));

  const noGpsNeeded = venueCoords.length === 0;

  useEffect(() => {
    if (!apiMode) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
        if (!raw || cancelled) return;
        const queue: OfflineEntry[] = JSON.parse(raw);
        if (!Array.isArray(queue) || queue.length === 0) return;
        const remaining: OfflineEntry[] = [];
        for (const entry of queue) {
          try {
            await apiSubmit({
              scheduleItemId: entry.scheduleItemId,
              eventTitle: entry.eventTitle,
              studentName: entry.studentName,
              matricNumber: entry.matricNumber,
              kulliyyah: entry.kulliyyah,
              latitude: entry.latitude,
              longitude: entry.longitude,
              status: "present"
            });
          } catch {
            remaining.push(entry);
          }
        }
        if (!cancelled) localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

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
      if (apiMode) {
        try {
          const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
          const queue: OfflineEntry[] = raw ? JSON.parse(raw) : [];
          queue.push({
            scheduleItemId: blockId,
            eventTitle: blockLabel,
            studentName: fullName,
            matricNumber,
            kulliyyah,
            latitude: gpsCoords?.lat || 0,
            longitude: gpsCoords?.lng || 0,
            savedAt: Date.now()
          });
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        } catch {}
      }
      setError(err instanceof Error ? err.message : "Failed to submit. Saved offline — will retry later.");
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
          <div className="check-in-success-actions" style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
            {onDone && (
              <button className="check-in-submit" style={{ width: "auto", paddingLeft: 20, paddingRight: 20 }} onClick={onDone}>
                Back to Schedule
              </button>
            )}
            <button
              className="check-in-submit"
              style={{ width: "auto", paddingLeft: 20, paddingRight: 20, background: "rgba(229,211,179,0.15)", color: "#E5D3B3" }}
              disabled={sharingCheckIn}
              onClick={handleShareCheckIn}
            >
              <Send size={16} style={{ marginRight: 6 }} aria-hidden="true" />
              {sharingCheckIn ? "Sharing..." : "Share Check-In"}
            </button>
          </div>
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
        {submitting ? <ThinkingOrb state="solving" size={20} /> : "Submit Check-In"}
      </button>
    </motion.div>
  );
}
