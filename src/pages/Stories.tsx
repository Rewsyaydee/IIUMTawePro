import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  CalendarDays,
  MapPin,
  Share2,
  Trophy,
  UserPlus,
  X
} from "lucide-react";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import { getSessionBlocks, getRequiredBlockCount } from "../data/eventSchedule";
import { getCurrentScheduleItem, getTaweWeekProgress, getVirtualScheduleDate } from "../lib/scheduleTime";
import { venues as allVenues } from "../features/navigation/data/venues";
import { ShareButton } from "../components/ShareButton";
import type { WrappedData, AchievementData, ScheduleCardData, CheckInCardData, InviteCardData } from "../lib/shareTemplates";
import { roleLabels } from "../constants";

function formatBlockTime(start: string, end: string): string {
  const s = start.slice(0, 5);
  const e = end.slice(0, 5);
  return `${s} – ${e}`;
}

function buildOgUrl(template: string, data: Record<string, unknown>): string {
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  const params = new URLSearchParams({ template });
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  });
  return `${base}/api/og?${params.toString()}`;
}

function Stories() {
  const { user } = useMockUser();
  const { schedule, studentAttendances } = useMockData();
  const now = getVirtualScheduleDate();
  const [serverPreview, setServerPreview] = useState<{ template: string; url: string } | null>(null);

  const blocks = useMemo(() => getSessionBlocks(schedule), [schedule]);
  const totalRequired = useMemo(() => getRequiredBlockCount(schedule), [schedule]);
  const milestones = useMemo(
    () => (totalRequired <= 3 ? [1, 2, 3] : totalRequired <= 5 ? [2, 4, 5] : [3, 5, totalRequired]),
    [totalRequired]
  );

  const userAttendances = useMemo(
    () => studentAttendances.filter((a) => a.userId === user.id),
    [studentAttendances, user.id]
  );
  const attendedCount = userAttendances.filter((a) => a.status === "present" || a.status === "excused").length;
  const attendedPct = totalRequired > 0 ? Math.round((attendedCount / totalRequired) * 100) : 0;
  const earnedKit = attendedCount >= totalRequired;

  const venueVisited = useMemo(() => {
    const venueSet = new Set<string>();
    userAttendances.forEach((a) => {
      const item = schedule.find((s) => s.id === a.scheduleItemId);
      if (item?.venueCode) venueSet.add(item.venueCode);
    });
    return venueSet.size;
  }, [userAttendances, schedule]);

  const gpsVenues = allVenues.filter((v) => v.lat && v.lng).length;

  const firstCheckIn = useMemo(() => {
    const sorted = [...userAttendances].sort(
      (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );
    if (sorted.length === 0) return null;
    const first = sorted[0];
    const item = schedule.find((s) => s.id === first.scheduleItemId);
    return {
      place: item?.venue || "Unknown",
      time: new Date(first.submittedAt).toLocaleString("en-MY", {
        hour: "2-digit", minute: "2-digit",
        day: "2-digit", month: "short"
      })
    };
  }, [userAttendances, schedule]);

  const weekProgress = useMemo(() => getTaweWeekProgress(schedule, now), [schedule, now]);
  const currentItem = useMemo(() => getCurrentScheduleItem(schedule, now), [schedule, now]);

  const dayLabel = now.toLocaleDateString("en-MY", { weekday: "long" });
  const dateDisplay = now.toLocaleDateString("en-MY", { day: "2-digit", month: "long", year: "numeric" });

  const todayBlocks = useMemo(() => {
    const dateStr = now.toISOString().slice(0, 10);
    return schedule
      .filter((s) => s.date === dateStr && !s.isConcurrent)
      .sort((a, b) => a.scheduledStartTime.localeCompare(b.scheduledStartTime))
      .slice(0, 6)
      .map((s) => ({
        time: formatBlockTime(s.scheduledStartTime, s.scheduledEndTime),
        title: s.title,
        venue: s.venue
      }));
  }, [schedule, now]);

  const latestCheckIn = useMemo(() => {
    const sorted = [...userAttendances].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    if (sorted.length === 0) return null;
    const latest = sorted[0];
    const item = schedule.find((s) => s.id === latest.scheduleItemId);
    return {
      eventTitle: latest.eventTitle,
      venue: item?.venue || "IIUM Campus",
      time: new Date(latest.submittedAt).toLocaleString("en-MY", {
        hour: "2-digit", minute: "2-digit",
        day: "2-digit", month: "short"
      }),
      lat: latest.latitude,
      lng: latest.longitude
    };
  }, [userAttendances, schedule]);

  const wrappedData: WrappedData = {
    username: user.name.split(" ")[0],
    attendedCount,
    totalRequired,
    attendedPct,
    venuesVisited: venueVisited,
    totalVenues: gpsVenues,
    firstCheckInPlace: firstCheckIn?.place || "N/A",
    firstCheckInTime: firstCheckIn?.time || "N/A",
    weekProgress
  };

  const achievementData: AchievementData = {
    username: user.name.split(" ")[0],
    attendedCount,
    totalRequired,
    earnedKit,
    milestones: milestones.map((target) => ({
      target,
      reached: attendedCount >= target
    }))
  };

  const scheduleData: ScheduleCardData = {
    dayLabel,
    dateDisplay,
    blocks: todayBlocks
  };

  const inviteData: InviteCardData = {
    username: user.name.split(" ")[0],
    roleLabel: user.bureau
      ? `${roleLabels[user.role]} of ${user.bureau}`
      : roleLabels[user.role]
  };

  const cards = [
    {
      id: "wrapped",
      icon: Trophy,
      title: "Tawe Wrapped",
      subtitle: "Your Ta'aruf Week journey in numbers",
      color: "#E5D3B3",
      template: "wrapped" as const,
      getData: () => wrappedData,
      buttonLabel: "Share Wrapped",
      serverParams: () => ({
        username: wrappedData.username,
        attended: wrappedData.attendedCount,
        total: wrappedData.totalRequired,
        pct: wrappedData.attendedPct,
        venues: wrappedData.venuesVisited,
        firstPlace: wrappedData.firstCheckInPlace,
        firstTime: wrappedData.firstCheckInTime,
        weekProgress: wrappedData.weekProgress
      })
    },
    {
      id: "achievement",
      icon: Award,
      title: "Achievement Card",
      subtitle: `${attendedCount}/${totalRequired} events — ${attendedPct}% complete`,
      color: "#22a879",
      template: "achievement" as const,
      getData: () => achievementData,
      buttonLabel: "Share Achievement",
      serverParams: () => ({
        username: achievementData.username,
        attended: achievementData.attendedCount,
        total: achievementData.totalRequired,
        earned: achievementData.earnedKit
      })
    },
    {
      id: "schedule",
      icon: CalendarDays,
      title: "Daily Schedule",
      subtitle: `${todayBlocks.length} sessions on ${dayLabel}`,
      color: "#5b9eb8",
      template: "schedule" as const,
      getData: () => scheduleData,
      buttonLabel: "Share Schedule",
      serverParams: () => ({
        dayLabel,
        dateDisplay,
        blocks: scheduleData.blocks
      })
    },
    {
      id: "checkin",
      icon: MapPin,
      title: "GPS Check-In Story",
      subtitle: latestCheckIn
        ? `Latest: ${latestCheckIn.venue} at ${latestCheckIn.time}`
        : "No check-ins yet",
      color: "#3db99a",
      template: "checkin" as const,
      getData: () => latestCheckIn ? {
        username: user.name.split(" ")[0],
        ...latestCheckIn
      } : null as unknown as CheckInCardData,
      buttonLabel: "Share Check-In",
      disabled: !latestCheckIn,
      serverParams: () => latestCheckIn ? {
        username: user.name.split(" ")[0],
        eventTitle: latestCheckIn.eventTitle,
        venue: latestCheckIn.venue,
        time: latestCheckIn.time,
        lat: latestCheckIn.lat,
        lng: latestCheckIn.lng
      } : null
    },
    {
      id: "invite",
      icon: UserPlus,
      title: "Invite Friends",
      subtitle: "Share t.me/iiumtaweprobot",
      color: "#9b8ac9",
      template: "invite" as const,
      getData: () => inviteData,
      buttonLabel: "Share Invite",
      serverParams: () => ({
        username: inviteData.username,
        roleLabel: inviteData.roleLabel
      })
    }
  ] as const;

  const handleServerPreview = (template: string, params: Record<string, unknown> | null) => {
    if (!params) return;
    setServerPreview({ template, url: buildOgUrl(template, params) });
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Share your journey</p>
          <h2>Share to Stories</h2>
        </div>
        <span className="soft-chip">#TaweAuTaraweh</span>
      </div>

      <p className="muted" style={{ marginBottom: 8 }}>
        Create beautiful shareable cards and post them directly to your Telegram Story.
      </p>

      <div className="share-cards-grid">
        {cards.map((card, index) => (
          <motion.article
            key={card.id}
            className="share-card-item glass-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <div className="share-card-top">
              <span
                className="share-card-icon"
                style={{ color: card.color, background: `${card.color}15` }}
              >
                <card.icon size={24} aria-hidden="true" />
              </span>
              <div>
                <h3>{card.title}</h3>
                <p>{card.subtitle}</p>
              </div>
            </div>

            <div className="share-card-preview">
              <div
                className="share-card-mock"
                style={{ background: `linear-gradient(135deg, ${card.color}10, #0a2e23)` }}
              >
                <card.icon size={40} color={card.color} opacity={0.3} />
              </div>
            </div>

            <ShareButton
              template={card.template}
              data={card.getData() as any}
              label={card.buttonLabel}
              disabled={(card as any).disabled}
              className="share-card-button"
            />
            <button
              className="outline-button full-width"
              type="button"
              disabled={(card as any).disabled}
              onClick={() => handleServerPreview(card.template, card.serverParams())}
            >
              <Share2 size={15} aria-hidden="true" />
              <span>Server preview</span>
            </button>
          </motion.article>
        ))}
      </div>

      {serverPreview && (
        <div className="share-preview-overlay" role="dialog" aria-label="Server-side card preview">
          <button
            className="share-preview-close"
            type="button"
            onClick={() => setServerPreview(null)}
            aria-label="Close preview"
          >
            <X size={22} />
          </button>
          <div className="share-preview-body">
            <div className="share-preview-image-wrap">
              <img
                src={serverPreview.url}
                alt={`${serverPreview.template} server-side preview`}
                className="share-preview-image"
              />
            </div>
            <p className="share-preview-hint">
              Rendered server-side with @vercel/og. Long-press to save.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export default Stories;
