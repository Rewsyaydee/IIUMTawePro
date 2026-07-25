import { getTelegramWebApp } from "./telegram";
import { hapticError, hapticSuccess } from "./telegram";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const STORAGE_BUCKET = "story-cards";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export async function uploadAndShareStory(
  imageBlob: Blob,
  caption: string = "#TaweAuTaraweh"
): Promise<boolean> {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    console.warn("Telegram WebApp not available — shareToStory skipped");
    return false;
  }

  const url = await uploadImageToStorage(imageBlob);
  if (!url) {
    hapticError();
    return false;
  }

  if (typeof webApp.shareToStory === "function") {
    webApp.shareToStory(url, {
      text: caption,
      widget_link: {
        url: "https://t.me/iiumtaweprobot",
        name: "IIUM TawePro"
      }
    });
    hapticSuccess();
    return true;
  }

  console.warn("shareToStory not available on this Telegram version");
  return false;
}

async function uploadImageToStorage(blob: Blob): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("No Supabase config — skipping upload");
    return null;
  }

  const fileName = `share-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  const path = `${STORAGE_BUCKET}/${fileName}`;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "image/png",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "x-upsert": "true"
        },
        body: blob
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Upload failed", err);
      return null;
    }

    return `${SUPABASE_URL}/storage/v1/object/public/${path}`;
  } catch (err) {
    console.error("Upload error", err);
    return null;
  }
}

export function getShareCaption(template: string): string {
  switch (template) {
    case "wrapped": return "My Ta'aruf Week journey so far! 📊 #TaweAuTaraweh";
    case "achievement": return "Just hit my attendance milestone! 🎯 #TaweAuTaraweh";
    case "schedule": return "Today's Ta'aruf Week schedule 📅 #TaweAuTaraweh";
    case "checkin": return "I just checked in! 📍 #TaweAuTaraweh";
    case "invite": return "Join me at Ta'aruf Week! 🤝 #TaweAuTaraweh";
    default: return "#TaweAuTaraweh";
  }
}
