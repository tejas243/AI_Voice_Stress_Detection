"use client";

import React from "react";
import { motion } from "framer-motion";

type AnimatedBackgroundProps = {
  variant?: "antigravity" | "minimal";
  className?: string;
};

export default function AnimatedBackground({
  variant = "antigravity",
  className = "",
}: AnimatedBackgroundProps) {
  if (variant === "minimal") {
    return (
      <div
        className={`fixed inset-0 -z-10 pointer-events-none ${className}`}
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(34,211,238,0.12), transparent 50%), radial-gradient(circle at 80% 35%, rgba(168,85,247,0.10), transparent 48%), #05060c",
        }}
      />
    );
  }

  return (
    <div className={`fixed inset-0 -z-10 pointer-events-none overflow-hidden ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(34,211,238,0.20), transparent 56%), radial-gradient(circle at 80% 30%, rgba(168,85,247,0.16), transparent 52%), radial-gradient(circle at 50% 85%, rgba(244,63,94,0.13), transparent 56%), #05060c",
        }}
      />

      <motion.div
        className="absolute left-[12%] top-[14%] h-[360px] w-[360px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.14), transparent 60%)",
          filter: "blur(12px)",
        }}
        animate={{
          x: [0, 48, 0],
          y: [0, 24, 0],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 14,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      <motion.div
        className="absolute left-[70%] top-[30%] h-[380px] w-[380px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(168,85,247,0.14), transparent 60%)",
          filter: "blur(12px)",
        }}
        animate={{
          x: [0, -52, 0],
          y: [0, 20, 0],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 16,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
    </div>
  );
}

