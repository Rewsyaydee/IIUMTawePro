import { Navigation } from "lucide-react";
import { hapticImpact } from "../../../lib/telegram";
import { playSfx } from "../../../lib/sfx";

type NavigateButtonProps = {
  onClick: () => void;
};

export function NavigateButton({ onClick }: NavigateButtonProps) {
  return (
    <button
      className="navigate-btn"
      type="button"
      onClick={() => {
        hapticImpact("medium");
        playSfx("forward");
        onClick();
      }}
    >
      <Navigation size={14} />
      <span>Navigate</span>
    </button>
  );
}
