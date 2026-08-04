import { useEffect, useState } from "react";
import { MapPin, AlertTriangle } from "lucide-react";
import { useMockData } from "../state/MockDataContext";
import { calculateDistance, getCurrentPosition, isWithinRadius } from "../lib/locationVerify";
import { getVirtualScheduleDate, getCurrentScheduleItem } from "../lib/scheduleTime";
import { getVenue } from "../features/navigation/data/venues";

export function CheckInReminder() {
  const { schedule } = useMockData();
  const [nearVenue, setNearVenue] = useState(true);
  const [distance, setDistance] = useState(0);
  const [venueName, setVenueName] = useState("");
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval>;

    const check = async () => {
      try {
        const now = getVirtualScheduleDate();
        const current = getCurrentScheduleItem(schedule, now);
        if (!current || current.isConcurrent) return;

        const venue = current.venueCode ? getVenue(current.venueCode) : null;
        if (!venue?.lat || !venue?.lng) return;

        const startTime = current.scheduledStartTime;
        if (!startTime) return;

        const [h, m] = startTime.split(":").map(Number);
        const startMin = h * 60 + m;
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const diff = startMin - nowMin;

        if (diff < 0 || diff > 30) return;

        const pos = await getCurrentPosition();
        const within = isWithinRadius(pos, { lat: venue.lat, lng: venue.lng }, 200);

        if (!cancelled) {
          setVenueName(venue.name || current.venue);
          setMinutesLeft(diff);
          setVisible(!within);
          if (!within) setDistance(Math.round(calculateDistance(pos, { lat: venue.lat, lng: venue.lng })));
        }
      } catch {}
    };

    check();
    interval = setInterval(check, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [schedule]);

  if (!visible || minutesLeft <= 0) return null;

  return (
    <div className="checkin-reminder-banner" role="alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <span>
        You're not at <strong>{venueName}</strong>. Session starts in <strong>{minutesLeft} min</strong>.
      </span>
      <MapPin size={14} aria-hidden="true" style={{ opacity: 0.5 }} />
    </div>
  );
}
