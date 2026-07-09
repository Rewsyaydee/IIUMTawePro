import { createPortal } from "react-dom";
import { MapPin, Navigation, X } from "lucide-react";
import { kulliyyahs, openKulliyyahDirections } from "../data/kulliyyahs";
import { getVenue } from "../data/venues";
import { getTelegramWebApp } from "../../../lib/telegram";

type KulliyyahPickerProps = {
  fromCode: string;
  onClose: () => void;
};

export function KulliyyahPicker({ fromCode, onClose }: KulliyyahPickerProps) {
  const from = getVenue(fromCode);
  const fromName = from?.name || fromCode;

  return createPortal(
    <div className="route-planner-overlay" onClick={onClose}>
      <div className="route-planner-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="route-planner-header">
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <h2>Select Your Kulliyyah</h2>
          <span />
        </div>

        <p style={{ margin: 0, color: "var(--tg-subtitle-text-color)", fontSize: "0.88rem", lineHeight: 1.5 }}>
          Ihsan Madani sessions are held at your respective kulliyyah. Select your kulliyyah below to get walking directions from <strong>{fromName}</strong>.
        </p>

        <div style={{ display: "grid", gap: "8px" }}>
          {kulliyyahs.map((k) => {
            const directions = openKulliyyahDirections(fromName, k);
            return (
              <article key={k.code} className="kulliyyah-card">
                <div className="kulliyyah-info">
                  <span className="kulliyyah-short">{k.short}</span>
                  <p>{k.name}</p>
                </div>
                <div className="kulliyyah-actions">
                  <button className="directions-btn" onClick={directions.google}>
                    <MapPin size={14} />
                    <span>Maps</span>
                  </button>
                  <button className="directions-btn" onClick={directions.waze}>
                    <Navigation size={14} />
                    <span>Waze</span>
                  </button>
                  <button className="directions-btn" onClick={directions.apple}>
                    <span style={{ fontSize: "14px", fontWeight: 900 }}>&#x2318;</span>
                    <span>Apple</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
