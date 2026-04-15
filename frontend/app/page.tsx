"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import StressDashboard from "../components/StressDashboard";
import SideSocialBar from "../components/SideSocialBar";

export default function Page() {
  const [lastAnalysisKey, setLastAnalysisKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    let raf = 0;
    let doneTimeout: number | null = null;
    let startTs: number | null = null;

    const totalMs = 2300;

    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const elapsed = ts - startTs;
      const p = Math.min(100, Math.round((elapsed / totalMs) * 100));
      setProgress(p);

      if (p >= 100) {
        doneTimeout = window.setTimeout(() => setShowLoader(false), 260);
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      if (doneTimeout) window.clearTimeout(doneTimeout);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {showLoader ? (
          <motion.div
            key="preloader"
            className="fixed inset-0 z-[100] bg-[#0a0b13] flex items-center justify-center overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.45, ease: "easeOut" } }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_38%),radial-gradient(circle_at_82%_25%,rgba(168,85,247,0.14),transparent_36%),radial-gradient(circle_at_50%_78%,rgba(244,63,94,0.1),transparent_40%)]" />
            </div>

            <div className="absolute top-7 left-8 text-sm font-semibold text-white/90">Tejas AI</div>
            <div className="absolute top-7 right-8 flex gap-2 items-end">
              {[18, 9, 14, 7, 16].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-sm bg-white/85"
                  style={{ height: h }}
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.08 }}
                />
              ))}
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-[16%] text-[clamp(1.35rem,3.6vw,3.2rem)] font-semibold tracking-tight text-white/90 text-center px-5"
            >
              Initializing Voice Intelligence
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="absolute top-[26%] text-xs md:text-sm text-white/60 text-center px-6"
            >
              Building acoustic embeddings, preparing timeline analysis, and loading visualization engine.
            </motion.p>

            <motion.div
              initial={{ y: 18, opacity: 0.85 }}
              animate={{ y: 0, opacity: 1 }}
              className="relative rounded-3xl bg-black/70 text-white p-5 shadow-2xl border border-white/10 w-[min(92vw,560px)]"
            >
              <div className="absolute inset-0 rounded-3xl pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.30),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(34,211,238,0.22),transparent_45%)]" />
              <div className="relative">
                <div className="flex items-center justify-between gap-6">
                  <span className="text-xs md:text-sm tracking-[0.18em] text-white/85">LOADING</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl md:text-3xl font-semibold tabular-nums">{progress}%</span>
                    <span className="inline-block h-4 w-2 bg-white/90 animate-pulse" />
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-rose-300"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut", duration: 0.18 }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-white/60">
                  Acoustic pipeline warm-up • Spectral model sync • Interface render pass
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="min-h-screen px-4 py-8 md:px-8">
        <SideSocialBar />
        <StressDashboard onReanalyze={() => setLastAnalysisKey((k) => k + 1)} analysisKey={lastAnalysisKey} />
      </main>
    </>
  );
}

