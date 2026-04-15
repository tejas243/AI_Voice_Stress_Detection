"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AiThinkingOverlay({ open }: { open: boolean }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="think"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[50] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.98, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative w-[92vw] max-w-lg rounded-3xl glass-strong border border-white/10 p-5"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-cyan-400/25 to-fuchsia-400/20 border border-white/10 flex items-center justify-center">
                  <motion.div
                    className="h-6 w-6 rounded-full bg-cyan-300/80 blur-[1px]"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.95, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">AI is analyzing the voice signal</div>
                <div className="text-xs text-white/60 mt-1">Extracting MFCC/Chroma/Mel + running classifier</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-300/80 via-fuchsia-300/70 to-rose-300/80"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {["Windowing", "Features", "Prediction"].map((t) => (
                  <div
                    key={t}
                    className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white/70"
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

