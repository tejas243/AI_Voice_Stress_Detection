"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PredictResponse, StressLevel } from "../../lib/api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const order: StressLevel[] = ["Low", "Medium", "High"];

function levelTheme(l: StressLevel) {
  switch (l) {
    case "Low":
      return {
        label: "Calm / Low tension",
        accent: "from-emerald-400 to-teal-400",
        text: "text-emerald-300",
        glow: "shadow-[0_0_40px_rgba(52,211,153,0.25)]",
        dot: "bg-emerald-400",
        bar: "bg-gradient-to-r from-emerald-400 to-teal-400",
        ribbon: "bg-emerald-500/15 border-emerald-400/40 text-emerald-200",
      };
    case "Medium":
      return {
        label: "Moderate load",
        accent: "from-amber-400 to-orange-400",
        text: "text-amber-300",
        glow: "shadow-[0_0_40px_rgba(251,191,36,0.2)]",
        dot: "bg-amber-400",
        bar: "bg-gradient-to-r from-amber-400 to-orange-400",
        ribbon: "bg-amber-500/15 border-amber-400/40 text-amber-200",
      };
    case "High":
      return {
        label: "Elevated stress markers",
        accent: "from-rose-400 to-fuchsia-500",
        text: "text-rose-300",
        glow: "shadow-[0_0_40px_rgba(244,63,94,0.25)]",
        dot: "bg-rose-500",
        bar: "bg-gradient-to-r from-rose-400 to-fuchsia-500",
        ribbon: "bg-rose-500/15 border-rose-400/40 text-rose-200",
      };
  }
}

function probBarClass(lvl: StressLevel) {
  switch (lvl) {
    case "Low":
      return "bg-gradient-to-r from-emerald-400 to-teal-400";
    case "Medium":
      return "bg-gradient-to-r from-amber-400 to-orange-400";
    case "High":
      return "bg-gradient-to-r from-rose-400 to-fuchsia-500";
  }
}

export default function StressReportModal({
  open,
  onOpenChange,
  resp,
  autoDownloadToken,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  resp: PredictResponse | null;
  autoDownloadToken: number;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);

  const probs = resp?.overall.probabilities ?? {};
  const level = resp?.overall.stressLevel ?? "Low";
  const confidence = resp?.overall.confidence ?? 0;
  const stressIndex = resp?.overall.stressIndex ?? 0;

  const probabilityRows = useMemo(() => {
    return order.map((lvl) => ({ lvl, v: probs[lvl] ?? 0 }));
  }, [probs]);

  const theme = levelTheme(level);
  const modelType = resp?.meta && typeof resp.meta.modelType === "string" ? resp.meta.modelType : null;
  const durationHint = useMemo(() => {
    if (!resp?.timeline?.length) return null;
    const last = resp.timeline[resp.timeline.length - 1];
    return `${last.tEnd.toFixed(1)}s analyzed`;
  }, [resp]);

  const onDownload = async () => {
    if (!contentRef.current) return;
    if (!resp) return;
    setDownloading(true);
    try {
      const capture = async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        return html2canvas(contentRef.current as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#0b1220",
          windowWidth: contentRef.current?.scrollWidth,
          windowHeight: contentRef.current?.scrollHeight,
        });
      };

      let canvas = await capture();
      if (canvas.width < 10 || canvas.height < 10) {
        await new Promise((r) => setTimeout(r, 120));
        canvas = await capture();
      }
      const imgData = canvas.toDataURL("image/png", 1.0);

      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgScaledWidth = pageWidth;
      const imgScaledHeight = (canvas.height * imgScaledWidth) / canvas.width;

      let heightLeft = imgScaledHeight;
      let y = 0;

      pdf.addImage(imgData, "PNG", 0, y, imgScaledWidth, imgScaledHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        y = -(imgScaledHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, y, imgScaledWidth, imgScaledHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`stress-report-${level.toLowerCase()}-${Date.now()}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const onDownloadJson = async () => {
    if (!resp) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      ...resp,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stress-report-${level.toLowerCase()}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // Keep View Report as preview only; user explicitly clicks Download PDF.
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoDownloadToken, resp]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/55"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            initial={{ scale: 0.98, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative w-full max-w-3xl glass-strong rounded-3xl border border-white/10 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="text-sm text-white/70">AI Report</div>
                <div className="text-lg font-semibold">Stress Summary & Insights</div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white/80 hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto px-5 py-4">
              <div
                ref={contentRef}
                className="rounded-2xl overflow-hidden border border-white/10"
                style={{
                  background:
                    "linear-gradient(165deg, #0b1220 0%, #0f172a 45%, #111827 100%)",
                }}
              >
                {/* PDF / preview: premium report sheet */}
                <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-rose-400 opacity-90" />

                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80 font-semibold">
                        AI Voice Stress Lab
                      </p>
                      <h2 className="mt-1 text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Stress Analysis Report
                      </h2>
                      <p className="mt-1 text-xs text-white/50">
                        Acoustic features · Windowed inference · Export-ready summary
                      </p>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <p className="text-[10px] uppercase tracking-wider text-white/45">Generated</p>
                      <p className="text-sm font-medium text-white/90">{new Date().toLocaleString()}</p>
                      {durationHint ? (
                        <p className="mt-1 text-xs text-white/50">{durationHint}</p>
                      ) : null}
                      {modelType ? (
                        <span
                          className={`inline-flex mt-2 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${
                            modelType === "ml"
                              ? "bg-cyan-500/15 border-cyan-400/35 text-cyan-200"
                              : "bg-violet-500/15 border-violet-400/35 text-violet-200"
                          }`}
                        >
                          Model · {modelType}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border p-5 sm:p-6 ${theme.glow} ${theme.ribbon}`}
                    style={{ borderWidth: 1 }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                          Final assessment
                        </p>
                        <p className={`text-4xl sm:text-5xl font-black mt-1 tracking-tight ${theme.text}`}>
                          {level}
                        </p>
                        <p className="mt-2 text-sm text-white/60">{theme.label}</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <div className="rounded-xl bg-black/30 border border-white/10 px-4 py-3 min-w-[130px]">
                          <p className="text-[10px] uppercase text-white/45 tracking-wide">Confidence</p>
                          <p className="text-2xl font-bold text-white tabular-nums">
                            {(confidence * 100).toFixed(0)}
                            <span className="text-base font-semibold text-white/50">%</span>
                          </p>
                          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${theme.bar}`}
                              style={{ width: `${Math.min(100, Math.max(4, confidence * 100))}%` }}
                            />
                          </div>
                        </div>
                        <div className="rounded-xl bg-black/30 border border-white/10 px-4 py-3 min-w-[130px]">
                          <p className="text-[10px] uppercase text-white/45 tracking-wide">Stress index</p>
                          <p className="text-2xl font-bold text-white tabular-nums">
                            {stressIndex.toFixed(2)}
                          </p>
                          <p className="mt-2 text-[11px] text-white/45">0 = calm · 1 = intense</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-black/25 border border-white/10 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <h3 className="text-sm font-semibold text-white">Class probabilities</h3>
                      <span className="text-[10px] text-white/40 uppercase tracking-wider hidden sm:inline">
                        Distribution
                      </span>
                    </div>
                    <div className="space-y-4">
                      {probabilityRows.map((r) => {
                        const pct = Math.round((r.v ?? 0) * 1000) / 10;
                        return (
                          <div key={r.lvl}>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span
                                className={
                                  r.lvl === "Low"
                                    ? "text-emerald-200 font-medium"
                                    : r.lvl === "Medium"
                                      ? "text-amber-200 font-medium"
                                      : "text-rose-200 font-medium"
                                }
                              >
                                {r.lvl}
                              </span>
                              <span className="text-white/80 tabular-nums font-semibold">{pct}%</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-white/[0.08] overflow-hidden ring-1 ring-white/5">
                              <div
                                className={`h-full rounded-full ${probBarClass(r.lvl)} shadow-lg`}
                                style={{
                                  width: `${Math.min(100, Math.max(2, pct))}%`,
                                  boxShadow: "0 0 12px rgba(255,255,255,0.15)",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex rounded-lg overflow-hidden h-2 ring-1 ring-white/10">
                      {probabilityRows.map((r) => (
                        <div
                          key={`stack-${r.lvl}`}
                          className={probBarClass(r.lvl)}
                          style={{ width: `${Math.max(0, (r.v ?? 0) * 100)}%` }}
                          title={`${r.lvl}: ${((r.v ?? 0) * 100).toFixed(1)}%`}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-white/40 text-center">
                      Stacked mix: Low + Medium + High relative share
                    </p>
                  </div>

                  <div className="rounded-2xl bg-black/25 border border-white/10 p-5 sm:p-6">
                    <h3 className="text-sm font-semibold text-white mb-2">AI explanation</h3>
                    <div className="rounded-xl border-l-4 border-cyan-400/60 bg-gradient-to-r from-cyan-500/10 to-transparent pl-4 pr-3 py-3">
                      <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">
                        {resp?.overall.explanation ?? "—"}
                      </p>
                    </div>
                    {resp?.overall.emotionHint ? (
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-fuchsia-300/90 font-semibold mb-1">
                          Emotion hint
                        </p>
                        <p className="text-sm text-white/70 leading-relaxed">{resp.overall.emotionHint}</p>
                      </div>
                    ) : null}
                  </div>

                  {resp ? (
                    <div className="rounded-2xl bg-black/25 border border-white/10 p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
                        <div>
                          <h3 className="text-sm font-semibold text-white">Timeline</h3>
                          <p className="text-xs text-white/50 mt-0.5">
                            {resp.meta?.windowSeconds
                              ? `Window ${resp.meta.windowSeconds}s · Hop ${resp.meta.hopSeconds ?? "—"}s`
                              : "Windowed predictions over your clip"}
                          </p>
                        </div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">
                          Window stress trajectory
                        </p>
                      </div>

                      {resp.timeline.length ? (
                        <>
                          <div className="flex rounded-xl overflow-hidden h-4 ring-1 ring-white/10 mb-1">
                            {resp.timeline.slice(0, 16).map((p, idx) => {
                              const w = Math.max(0.05, p.tEnd - p.tStart);
                              return (
                                <div
                                  key={idx}
                                  className={`${levelTheme(p.stressLevel).bar} opacity-90 border-r border-black/20 last:border-r-0`}
                                  style={{ flex: w }}
                                  title={`${p.tStart.toFixed(1)}–${p.tEnd.toFixed(1)}s · ${p.stressLevel}`}
                                />
                              );
                            })}
                          </div>
                          <div className="flex justify-between text-[9px] text-white/40 px-0.5 mb-4">
                            <span>0s</span>
                            <span>{resp.timeline[Math.min(15, resp.timeline.length - 1)].tEnd.toFixed(1)}s</span>
                          </div>
                        </>
                      ) : null}

                      <div className="space-y-2">
                        {resp.timeline.slice(0, 12).map((p, idx) => {
                          const t = levelTheme(p.stressLevel);
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/5 px-3 py-2.5"
                            >
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.dot} ring-2 ring-white/20`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-white/55 tabular-nums">
                                  {p.tStart.toFixed(2)}s → {p.tEnd.toFixed(2)}s
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className={`text-sm font-bold ${t.text}`}>{p.stressLevel}</span>
                                  <span className="text-xs text-white/50">
                                    {(p.confidence * 100).toFixed(0)}% conf.
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[10px] uppercase text-white/40">Energy</p>
                                <p className="text-sm font-mono text-white/80 tabular-nums">
                                  {(p.energy ?? 0).toFixed(3)}
                                </p>
                              </div>
                              <div className="hidden sm:block w-16">
                                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${t.bar}`}
                                    style={{ width: `${Math.min(100, Math.max(8, (p.confidence ?? 0) * 100))}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {resp.timeline.length > 12 ? (
                          <p className="text-xs text-white/45 text-center pt-1">
                            + {resp.timeline.length - 12} additional window
                            {resp.timeline.length - 12 === 1 ? "" : "s"} (see JSON export for full data)
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-white/10 pb-1">
                    <p className="text-[10px] text-white/35 text-center sm:text-left">
                      AI Voice Stress Detection · Report generated locally in your browser
                    </p>
                    <div className="flex gap-2 text-[10px] text-white/35">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" /> Low
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400" /> Medium
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> High
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between">
              <div className="text-xs text-white/60">
                Export is generated locally in your browser (free/open-source).
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onDownloadJson}
                  disabled={!resp}
                  className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50 transition"
                >
                  Export JSON
                </button>
                <button
                  onClick={onDownload}
                  disabled={downloading || !resp}
                  className="rounded-xl bg-gradient-to-r from-cyan-400/40 via-fuchsia-400/30 to-rose-400/30 hover:from-cyan-400/55 hover:via-fuchsia-400/45 hover:to-rose-400/45 border border-white/10 px-4 py-2 text-sm disabled:opacity-50 transition"
                >
                  {downloading ? "Generating PDF..." : "Download PDF"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

