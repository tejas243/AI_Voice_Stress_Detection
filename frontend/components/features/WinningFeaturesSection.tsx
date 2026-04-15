"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadialBarChart,
  RadialBar,
} from "recharts";
import type { PredictResponse } from "../../lib/api";

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function scoreToLabel(v: number) {
  if (v < 0.34) return "Low";
  if (v < 0.67) return "Medium";
  return "High";
}

function stressToEmotion(score01: number) {
  if (score01 < 0.30) return "Calm";
  if (score01 < 0.50) return "Focused";
  if (score01 < 0.70) return "Alert";
  return "Tense";
}

function emotionColor(e: string) {
  if (e === "Calm") return "bg-cyan-300/70";
  if (e === "Focused") return "bg-emerald-300/70";
  if (e === "Alert") return "bg-amber-300/75";
  return "bg-rose-300/75";
}

export default function WinningFeaturesSection({
  resp,
  liveStress01,
  inputDurationSec,
}: {
  resp: PredictResponse | null;
  liveStress01: number;
  inputDurationSec: number;
}) {
  const timelineData = useMemo(() => {
    if (!resp) return [];
    return resp.timeline.map((p, idx) => {
      const numeric =
        p.stressLevel === "Low" ? 0.2 : p.stressLevel === "Medium" ? 0.55 : 0.9;
      return {
        t: p.tEnd,
        stress: numeric,
        conf: p.confidence,
        emotion: stressToEmotion(numeric),
        idx,
      };
    });
  }, [resp]);

  const avgConf = resp?.overall?.confidence ?? 0;
  const stressIndex = resp?.overall?.stressIndex ?? 0;

  const gamifiedScore = useMemo(() => {
    if (!resp) return 0;
    const volatility =
      timelineData.length > 1
        ? Math.min(
            1,
            timelineData
              .slice(1)
              .reduce((s, p, i) => s + Math.abs(p.stress - timelineData[i].stress), 0) /
              (timelineData.length - 1)
          )
        : 0.5;
    const confidencePart = avgConf * 35;
    const calmnessPart = (1 - clamp01(stressIndex)) * 30;
    const stabilityPart = (1 - volatility) * 20;
    const durationPart = Math.min(15, (inputDurationSec / 10) * 15);
    return Math.max(0, Math.min(100, Math.round(confidencePart + calmnessPart + stabilityPart + durationPart)));
  }, [resp, avgConf, stressIndex, inputDurationSec, timelineData]);

  const interviewReady = useMemo(() => {
    if (!resp) return "Pending analysis";
    if (stressIndex < 0.4) return "Excellent interview readiness";
    if (stressIndex < 0.65) return "Good readiness, moderate tension";
    return "High tension detected, practice breathing + pacing";
  }, [resp, stressIndex]);

  const interviewReadinessScore = useMemo(() => {
    if (!resp) return 0;
    return Math.round((avgConf * 45) + ((1 - clamp01(stressIndex)) * 55));
  }, [resp, avgConf, stressIndex]);

  const explanationBullets = useMemo(() => {
    if (!resp) return [];
    const e = resp.timeline.map((t) => t.energy);
    const eMean = e.length ? e.reduce((a, b) => a + b, 0) / e.length : 0;
    const eMax = e.length ? Math.max(...e) : 0;
    const eMin = e.length ? Math.min(...e) : 0;
    const spread = eMax - eMin;
    return [
      `Model output: ${resp.overall.stressLevel} (${(avgConf * 100).toFixed(0)}% confidence), stress index ${stressIndex.toFixed(2)}.`,
      `Energy profile: mean ${eMean.toFixed(3)}, min ${eMin.toFixed(3)}, max ${eMax.toFixed(3)}, spread ${spread.toFixed(3)}.`,
      `Temporal behavior: ${resp.timeline.length} timeline segments with emotion drift from ${timelineData[0]?.emotion ?? "N/A"} to ${timelineData[timelineData.length - 1]?.emotion ?? "N/A"}.`,
    ];
  }, [resp, stressIndex, avgConf, timelineData]);

  const effectiveLiveGauge = useMemo(() => {
    if (liveStress01 > 0.015) return clamp01(liveStress01);
    return clamp01(stressIndex);
  }, [liveStress01, stressIndex]);

  return (
    <section id="features" className="scroll-mt-24 mt-6">
      <motion.div
        className="rounded-2xl glass-strong p-5 border border-white/10"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45 }}
      >
        <div className="text-xs text-white/60 mt-1">
          Advanced insights section
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeatureCard title="Emotion Timeline" className="md:col-span-2">
            {resp ? (
              <div className="space-y-3">
                <div className="h-52 rounded-xl bg-white/5 border border-white/10 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData}>
                      <defs>
                        <linearGradient id="emotionArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(56,189,248,0.65)" />
                          <stop offset="100%" stopColor="rgba(56,189,248,0.05)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                      <XAxis
                        dataKey="t"
                        tickFormatter={(v) => `${Number(v).toFixed(1)}s`}
                        tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
                      />
                      <YAxis
                        domain={[0, 1]}
                        tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(0,0,0,0.65)",
                          border: "1px solid rgba(255,255,255,0.14)",
                        }}
                        formatter={(v: any, key: any, payload: any) => {
                          if (key === "stress") return [payload?.payload?.emotion, "Emotion"];
                          return [v, key];
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="stress"
                        stroke="rgba(56,189,248,0)"
                        fill="url(#emotionArea)"
                      />
                      <Line
                        type="monotone"
                        dataKey="stress"
                        stroke="rgba(56,189,248,0.95)"
                        strokeWidth={2.7}
                        dot={{ r: 2, fill: "rgba(56,189,248,0.95)" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2">
                  {timelineData.slice(0, 10).map((p) => (
                    <span
                      key={`${p.idx}-${p.t}`}
                      className={`text-[10px] rounded-full px-2 py-1 border border-white/10 text-black ${emotionColor(
                        p.emotion
                      )}`}
                    >
                      {p.emotion} • {p.t.toFixed(1)}s
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyHint />
            )}
          </FeatureCard>

          <FeatureCard title="Interview Mode">
            {resp ? (
              <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                <div className="h-[120px] w-[120px] mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="65%"
                      outerRadius="100%"
                      startAngle={90}
                      endAngle={-270}
                      data={[{ name: "readiness", value: interviewReadinessScore }]}
                    >
                      <RadialBar
                        dataKey="value"
                        cornerRadius={10}
                        fill="rgba(56,189,248,0.95)"
                        background={{ fill: "rgba(255,255,255,0.12)" }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="-mt-[74px] text-center">
                    <div className="text-lg font-semibold">{interviewReadinessScore}</div>
                    <div className="text-[10px] text-white/60">/100</div>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-white/75">
                  <div>
                    Readiness:{" "}
                    <span className="font-semibold text-white/90">{interviewReady}</span>
                  </div>
                  <div className="text-xs text-white/60">
                    Duration analyzed: {inputDurationSec.toFixed(1)}s
                  </div>
                  <div className="text-xs text-white/60">
                    Suggested pace:{" "}
                    {stressIndex > 0.65
                      ? "Slow down by 10-15%"
                      : stressIndex > 0.45
                      ? "Keep steady pace"
                      : "Natural confident pace"}
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white/65">
                    Breathing cue: inhale 4s, hold 2s, exhale 4s before speaking.
                  </div>
                </div>
              </div>
            ) : (
              <EmptyHint />
            )}
          </FeatureCard>

          <FeatureCard title="AI Explanation">
            {resp ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Kpi label="Stress Index" value={stressIndex.toFixed(2)} />
                  <Kpi label="Confidence" value={`${(avgConf * 100).toFixed(0)}%`} />
                  <Kpi label="Segments" value={`${resp.timeline.length}`} />
                </div>
                <div className="space-y-2">
                  {explanationBullets.map((b) => (
                    <div key={b} className="text-xs text-white/70 leading-relaxed rounded-lg bg-white/5 border border-white/10 px-2.5 py-2">
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyHint />
            )}
          </FeatureCard>

          <FeatureCard title="Live Stress Gauge">
            <div className="space-y-3">
              <div className="h-3 rounded-full bg-white/10 border border-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-300 via-amber-300 to-rose-400"
                  animate={{ width: `${effectiveLiveGauge * 100}%` }}
                  transition={{ duration: 0.16 }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Kpi label="Live Index" value={effectiveLiveGauge.toFixed(2)} />
                <Kpi label="State" value={scoreToLabel(effectiveLiveGauge)} />
                <Kpi label="Source" value={liveStress01 > 0.015 ? "Mic" : "Analysis"} />
              </div>
            </div>
          </FeatureCard>

          <FeatureCard title="Gamified Score" className="md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-[130px_1fr] gap-4 items-center">
              <div className="text-center">
                <div className="text-3xl font-semibold text-white tabular-nums">{gamifiedScore}</div>
                <div className="text-xs text-white/60">/100</div>
              </div>
              <div className="space-y-2">
                <div className="h-2.5 rounded-full bg-white/10 border border-white/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-rose-300"
                    animate={{ width: `${gamifiedScore}%` }}
                    transition={{ duration: 0.35 }}
                  />
                </div>
                <div className="text-xs text-white/65">
                  Dynamic score from calmness, confidence, stability, and speaking duration.
                </div>
              </div>
            </div>
          </FeatureCard>
        </div>
      </motion.div>
    </section>
  );
}

function FeatureCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-white/5 border border-white/10 p-4 ${className}`}>
      <div className="text-sm font-semibold text-white/90">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-2">
      <div className="text-[10px] text-white/55">{label}</div>
      <div className="text-sm font-semibold text-white/90 mt-0.5">{value}</div>
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="text-xs text-white/60 rounded-xl bg-white/5 border border-white/10 p-3">
      Run an analysis to populate this panel.
    </div>
  );
}

