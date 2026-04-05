"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export default function StressIndexMeter({
  value,
}: {
  value: number; // expected 0..1
}) {
  const v = clamp01(value);
  const pct = v * 100;

  const label = useMemo(() => {
    if (v < 0.33) return "Low zone";
    if (v < 0.66) return "Medium zone";
    return "High zone";
  }, [v]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>0</span>
        <span className="text-white/70">{label}</span>
        <span>1</span>
      </div>

      <div className="relative h-4 rounded-full overflow-hidden border border-white/10 bg-white/5">
        {/* Segmented zones */}
        <div className="absolute inset-0 grid grid-cols-3">
          <div className="bg-gradient-to-r from-cyan-400/35 to-cyan-200/10" />
          <div className="bg-gradient-to-r from-amber-400/30 to-amber-200/10" />
          <div className="bg-gradient-to-r from-rose-400/30 to-fuchsia-400/15" />
        </div>

        {/* Subtle shimmer */}
        <motion.div
          className="absolute inset-0 opacity-35"
          animate={{ x: ["-30%", "130%"] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.14) 50%, transparent 100%)",
            width: "30%",
          }}
        />

        {/* Indicator */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2"
          initial={false}
          animate={{ left: `${pct}%` }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          style={{ transform: "translate(-50%, -50%)" }}
        >
          <div className="h-5 w-5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm flex items-center justify-center">
            <div className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.75)]" />
          </div>
        </motion.div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-white/55">Stress Index</div>
        <div className="text-sm font-semibold tabular-nums">{v.toFixed(2)}</div>
      </div>
    </div>
  );
}

