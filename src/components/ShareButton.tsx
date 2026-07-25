import { useState } from "react";
import { Share2 } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import { uploadAndShareStory, getShareCaption } from "../lib/shareToStory";
import type {
  WrappedData,
  AchievementData,
  ScheduleCardData,
  CheckInCardData,
  InviteCardData
} from "../lib/shareTemplates";

type CardTemplate =
  | "wrapped"
  | "achievement"
  | "schedule"
  | "checkin"
  | "invite";

type CardDataMap = {
  wrapped: WrappedData;
  achievement: AchievementData;
  schedule: ScheduleCardData;
  checkin: CheckInCardData;
  invite: InviteCardData;
};

type RenderFn<T extends CardTemplate> = (data: CardDataMap[T]) => Promise<Blob | null>;

const renderers: { [K in CardTemplate]: RenderFn<K> } = {
  wrapped: async (d) => {
    const { renderWrappedCard } = await import("../lib/shareTemplates");
    return renderWrappedCard(d as WrappedData);
  },
  achievement: async (d) => {
    const { renderAchievementCard } = await import("../lib/shareTemplates");
    return renderAchievementCard(d as AchievementData);
  },
  schedule: async (d) => {
    const { renderScheduleCard } = await import("../lib/shareTemplates");
    return renderScheduleCard(d as ScheduleCardData);
  },
  checkin: async (d) => {
    const { renderCheckInCard } = await import("../lib/shareTemplates");
    return renderCheckInCard(d as CheckInCardData);
  },
  invite: async (d) => {
    const { renderInviteCard } = await import("../lib/shareTemplates");
    return renderInviteCard(d as InviteCardData);
  }
};

export function ShareButton<K extends CardTemplate>({
  template,
  data,
  label,
  disabled,
  className = "primary-button"
}: {
  template: K;
  data: CardDataMap[K];
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [sharing, setSharing] = useState(false);
  const [done, setDone] = useState(false);

  const handleShare = async () => {
    if (sharing || disabled) return;
    setSharing(true);
    setDone(false);
    try {
      const renderFn = renderers[template];
      const blob = await renderFn(data);
      if (!blob) return;
      const caption = getShareCaption(template);
      const success = await uploadAndShareStory(blob, caption);
      if (success) setDone(true);
    } catch (err) {
      console.error("Share failed", err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <button
      className={className}
      type="button"
      disabled={disabled || sharing}
      onClick={handleShare}
    >
      {sharing ? (
        <ThinkingOrb state="solving" size={20} />
      ) : done ? (
        <>
          <Share2 size={18} aria-hidden="true" />
          <span>Shared!</span>
        </>
      ) : (
        <>
          <Share2 size={18} aria-hidden="true" />
          <span>{label || "Share to Story"}</span>
        </>
      )}
    </button>
  );
}
