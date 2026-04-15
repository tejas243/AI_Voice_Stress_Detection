"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
} from "recharts";
import type { PredictResponse } from "../../lib/api";

type TimelinePoint = PredictResponse["timeline"][number];

export default function TrendChart({ timeline }: { timeline: TimelinePoint[] }) {
  const data = useMemo(() => {
    const maxEnergy = Math.max(1e-9, ...timeline.map((p) => p.energy));
    return timeline.map((p) => ({
      t: p.tEnd,
      energyN: p.energy / maxEnergy,
      conf: p.confidence,
      level: p.stressLevel,
    }));
  }, [timeline]);

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="t"
            type="number"
            tickFormatter={(v) => `${v.toFixed(1)}s`}
            tick={{ fill: "rgba(255,255,255,0.7)" }}
          />
          <YAxis tick={{ fill: "rgba(255,255,255,0.7)" }} domain={[0, 1]} />
          <Tooltip
            contentStyle={{
              background: "rgba(0,0,0,0.65)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
            formatter={(value: any) => (typeof value === "number" ? value.toFixed(3) : value)}
            labelFormatter={(label) => `t=${label}s`}
          />
          <Area
            type="monotone"
            dataKey="energyN"
            stroke="rgba(34,211,238,0.6)"
            fill="rgba(34,211,238,0.12)"
            isAnimationActive
          />
          <Line
            type="monotone"
            dataKey="conf"
            stroke="rgba(168,85,247,0.95)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

