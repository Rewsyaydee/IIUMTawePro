import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { hapticImpact } from "../lib/telegram";

type MenuTileProps = {
  to: string;
  title: string;
  meta: string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red" | "violet";
};

export function MenuTile({ to, title, meta, icon: Icon, tone = "blue" }: MenuTileProps) {
  return (
    <motion.div whileTap={{ scale: 0.98 }}>
      <Link className={`menu-tile tile-${tone}`} to={to} onClick={() => hapticImpact("medium")}>
        <span className="tile-icon">
          <Icon size={22} aria-hidden="true" />
        </span>
        <span>
          <strong style={{ display: "block" }}>{title}</strong>
          <small style={{ display: "block" }}>{meta}</small>
        </span>
      </Link>
    </motion.div>
  );
}
