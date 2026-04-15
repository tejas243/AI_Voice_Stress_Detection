"use client";

import React from "react";
import { motion } from "framer-motion";
import type { StressLevel } from "../../lib/api";

const order: StressLevel[] = ["Low", "Medium", "High"];

function gradientFor(level: StressLevel) {
  if (level === "Low") return "from-cyan-400/80 to-cyan-200/25";
  if (level === "Medium") return "from-amber-400/80 to-amber-200/25";
  return "from-rose-400/80 to-rose-200/25";
}

export default function ConfidenceBars({
  probabilities,
}: {
  probabilities: Partial<Record<StressLevel, number>>;
}) {
  return (
    <div className="space-y-3">
      {order.map((lvl) => {
        const v = clamp01(probabilities[lvl] ?? 0);
        return (
          <div key={lvl} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>{lvl}</span>
              <span className="tabular-nums">{Math.round(v * 100)}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 border border-white/10 overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${gradientFor(lvl)}`}
                initial={{ width: 0 }}
                animate={{ width: `${v * 100}%` }}
                transition={{ duration: 0.75, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

