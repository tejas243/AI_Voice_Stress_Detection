"use client";

import React from "react";
import { motion } from "framer-motion";
import type { StressLevel } from "../../lib/api";

function levelColor(level: StressLevel) {
  switch (level) {
    case "Low":
      return { main: "rgba(34, 211, 238, 0.95)", accent: "rgba(56, 189, 248, 0.55)" };
    case "Medium":
      return { main: "rgba(250, 204, 21, 0.95)", accent: "rgba(251, 191, 36, 0.55)" };
    case "High":
      return { main: "rgba(244, 63, 94, 0.95)", accent: "rgba(244, 63, 94, 0.45)" };
  }
}

export default function StressGauge({ level, confidence }: { level: StressLevel; confidence: number }) {
  const pct = Math.max(0, Math.min(1, confidence));
  const radius = 70;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * pct;

  const { main } = levelColor(level);

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <motion.div
          initial={{ scale: 0.98, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 18 }}
          className="flex items-center justify-center"
        >
          <svg width="190" height="190" viewBox="0 0 180 180">
            <defs>
              <filter id="gaugeGlow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={main} stopOpacity="1" />
                <stop offset="100%" stopColor="rgba(168, 85, 247, 0.95)" stopOpacity="1" />
              </linearGradient>
            </defs>

            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={stroke}
              fill="transparent"
            />

            <motion.circle
              cx="90"
              cy="90"
              r={radius}
              stroke="url(#gaugeGrad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={`${dash} ${circumference - dash}`}
              initial={{ rotate: -90, opacity: 0.7 }}
              animate={{ opacity: 1 }}
              filter="url(#gaugeGlow)"
              style={{ transformOrigin: "90px 90px" }}
            />
          </svg>
        </motion.div>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-xs text-white/60">Stress</div>
          <div className="text-3xl font-bold drop-shadow text-white mt-1">{level}</div>
          <div className="text-xs text-white/70 mt-1">{Math.round(confidence * 100)}% confidence</div>
        </div>
      </div>
    </div>
  );
}

