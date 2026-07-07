import { Navigation, X } from "lucide-react";
import type { Transition } from "../hooks/useScheduleTransition";
import { getVenue } from "../data/venues";

type TransitionReminderBannerProps = {
  transition: Transition;
  onNavigate: () => void;
  onDismiss: () => void;
};

export function TransitionReminderBanner({ transition, onNavigate, onDismiss }: TransitionReminderBannerProps) {
  const from = getVenue(transition.fromCode);
  const to = getVenue(transition.toCode);

  return (
    <div className="transition-reminder">
      <div className="transition-reminder-content">
        <Navigation size={18} />
        <div>
          <strong>Next: {from?.shortName} → {to?.shortName}</strong>
          <p>
            In {transition.timeUntilTransition} min · {transition.toItem.title}
          </p>
        </div>
      </div>
      <div className="transition-reminder-actions">
        <button className="primary-button" type="button" onClick={onNavigate}>
          View route
        </button>
        <button className="icon-button" type="button" onClick={onDismiss} aria-label="Dismiss reminder">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
