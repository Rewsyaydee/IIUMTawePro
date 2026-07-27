import { useState } from "react";
import { Download, Share2, AlertTriangle } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import { uploadAndShareStory, getShareCaption, downloadImageAsFile, isInTelegram } from "../lib/shareToStory";
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
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [lastFilename, setLastFilename] = useState("");
  const [error, setError] = useState("");

  const handleShare = async () => {
    if (sharing || disabled) return;
    setSharing(true);
    setDone(false);
    setLastBlob(null);
    setError("");
    try {
      const renderFn = renderers[template];
      const blob = await renderFn(data);
      if (!blob) {
        setError("Could not generate the image. Please try again.");
        return;
      }

      const caption = getShareCaption(template);
      const result = await uploadAndShareStory(blob, caption);

      if (result.success) {
        setDone(true);
      } else {
        setError(result.error || "Something went wrong.");
        setLastBlob(blob);
        setLastFilename(`tawe-${template}-${Date.now()}.png`);
      }
    } catch (err) {
      console.error("Share failed", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = () => {
    if (!lastBlob) return;
    downloadImageAsFile(lastBlob, lastFilename);
  };

  if (disabled) {
    return (
      <button className={className} type="button" disabled>
        <Share2 size={18} aria-hidden="true" />
        <span>{label || "Share to Story"}</span>
      </button>
    );
  }

  return (
    <div className="share-button-group">
      <button
        className={className}
        type="button"
        disabled={sharing}
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

      {error && (
        <div className="share-error-banner" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{error}</span>
          {lastBlob && (
            <button
              type="button"
              className="share-download-fallback"
              onClick={handleDownload}
            >
              <Download size={14} aria-hidden="true" />
              <span>Save image</span>
            </button>
          )}
        </div>
      )}

      {done && (
        <button
          type="button"
          className="share-download-fallback"
          onClick={handleDownload}
          style={{ marginTop: 6 }}
        >
          <Download size={14} aria-hidden="true" />
          <span>Save image</span>
        </button>
      )}
    </div>
  );
}
