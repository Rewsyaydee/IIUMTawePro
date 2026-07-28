import { useState } from "react";
import { Send, X, Copy, Check } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import { shareToChat } from "../lib/shareToStory";
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
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (sharing || disabled) return;
    setSharing(true);
    setDone(false);
    setPreviewUrl(null);
    setError("");
    setCopied(false);
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
      } else {
        console.error("[shareToChat] failed:", {
          template,
          error: result.error,
          downloadUrl: result.downloadUrl
        });
        setError(result.error || "Something went wrong.");
        if (result.downloadUrl) setPreviewUrl(result.downloadUrl);
      }
    } catch (err) {
      console.error("[ShareButton] unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  const dismissPreview = () => {
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

      {error && !previewUrl && (
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
            <X size={22} />
          </button>

          <div className="share-preview-body">
            {error && (
              <div className="share-preview-error" role="alert">
                <span>{error}</span>
              </div>
            )}

            <div className="share-preview-image-wrap">
              <img
                src={previewUrl}
                alt={`${template} share card`}
                className="share-preview-image"
              />
            </div>

            <p className="share-preview-hint">
              Long-press the image to save it to your gallery
            </p>

            <button
              type="button"
              className="share-preview-copy"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" />
                  <span>Copy image link</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
