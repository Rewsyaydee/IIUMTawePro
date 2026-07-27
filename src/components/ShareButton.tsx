import { useState } from "react";
import { Download, Send, X, Save } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import { shareToChat, downloadImageAsFile } from "../lib/shareToStory";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastFilename, setLastFilename] = useState("");
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");

  const handleShare = async () => {
    if (sharing || disabled) return;
    setSharing(true);
    setDone(false);
    setPreviewUrl(null);
    setLastBlob(null);
    setError("");
    try {
      const renderFn = renderers[template];
      const blob = await renderFn(data);
      if (!blob) {
        setError("Could not generate the image. Please try again.");
        return;
      }

      const result = await shareToChat(blob);

      if (result.success) {
        setDone(true);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setLastBlob(blob);
        setLastFilename(`tawe-${template}-${Date.now()}.png`);
      } else {
        setError(result.error || "Something went wrong.");
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
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

  const dismissPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setError("");
  };

  if (disabled) {
    return (
      <button className={className} type="button" disabled>
        <Send size={18} aria-hidden="true" />
        <span>{label || "Send to Chat"}</span>
      </button>
    );
  }

  return (
    <>
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
            <Send size={18} aria-hidden="true" />
            <span>Sent!</span>
          </>
        ) : (
          <>
            <Send size={18} aria-hidden="true" />
            <span>{label || "Send to Chat"}</span>
          </>
        )}
      </button>

      {error && (
        <div className="share-error-banner" role="alert">
          <span>{error}</span>
        </div>
      )}

      {previewUrl && (
        <div className="share-preview-overlay" role="dialog" aria-label="Share image preview">
          <button
            className="share-preview-close"
            type="button"
            onClick={dismissPreview}
            aria-label="Close preview"
          >
            <X size={24} />
          </button>

          {done ? (
            <p className="share-preview-status" style={{ color: "#22a879" }}>Sent!</p>
          ) : (
            <p className="share-preview-status">Long-press the image to save it to your gallery</p>
          )}

          <div className="share-preview-image-wrap">
            <img
              src={previewUrl}
              alt={`${template} share card`}
              className="share-preview-image"
            />
          </div>

          <button
            type="button"
            className="share-preview-download"
            onClick={handleDownload}
          >
            <Save size={18} aria-hidden="true" />
            <span>Download</span>
          </button>
        </div>
      )}
    </>
  );
}
