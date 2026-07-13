import { motion } from "framer-motion";

export function ColorSweepText({ text = "NOW" }: { text?: string }) {
  return (
    <motion.div
      style={{
        backgroundImage: "linear-gradient(90deg, #E5D3B3 0%, #FFFFFF 50%, #E5D3B3 100%)",
        backgroundSize: "200% 100%",
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        display: "inline-block",
        fontWeight: 800,
        fontSize: "0.68rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
      animate={{
        backgroundPositionX: ["0%", "200%"],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {text}
    </motion.div>
  );
}
