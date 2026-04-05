"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PredictResponse } from "../lib/api";
import { predictStress } from "../lib/api";
import { resolveWorkingBackend, BACKEND_URL_CANDIDATES } from "../lib/backend";
import AudioRecorderWav from "./audio/AudioRecorderWav";
import UploadPanel from "./upload/UploadPanel";
import WaveformCanvas from "./visuals/WaveformCanvas";
import SpectrogramCanvas from "./visuals/SpectrogramCanvas";
import StressGauge from "./visuals/StressGauge";
import ConfidenceBars from "./visuals/ConfidenceBars";
import TrendChart from "./visuals/TrendChart";
import AiThinkingOverlay from "./visuals/AiThinkingOverlay";
import StressReportModal from "./report/StressReportModal";
import StressIndexMeter from "./visuals/StressIndexMeter";
import WinningFeaturesSection from "./features/WinningFeaturesSection";

export default function StressDashboard({
  onReanalyze,
  analysisKey,
}: {
  onReanalyze: () => void;
  analysisKey: number;
}) {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [vizSamples, setVizSamples] = useState<Float32Array | null>(null);
  const [vizSampleRate, setVizSampleRate] = useState<number>(16000);
  const [liveStress01, setLiveStress01] = useState(0);

  const [status, setStatus] = useState<"idle" | "recording" | "ready" | "analyzing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resp, setResp] = useState<PredictResponse | null>(null);
  const analyzingRef = useRef(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [autoDownloadToken, setAutoDownloadToken] = useState(0);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  const [sessionHistory, setSessionHistory] = useState<
    Array<{
      id: string;
      at: string;
      level: string;
      confidence: number;
      stressIndex: number;
      durationSec: number;
      modelType?: string;
    }>
  >([]);

  const canAnalyze = !!audioBlob && status !== "analyzing";

  const overallLevel = resp?.overall.stressLevel ?? "Low";
  const overallConfidence = resp?.overall.confidence ?? 0;
  const overallProbs = useMemo(() => resp?.overall.probabilities ?? {}, [resp]);
  const modelType = resp?.meta?.modelType as string | undefined;
  const inputQuality = useMemo(() => {
    if (!vizSamples || vizSamples.length === 0) {
      return { durationSec: 0, rms: 0, peak: 0, tags: ["No signal"] as string[] };
    }
    const durationSec = vizSamples.length / Math.max(1, vizSampleRate);
    let peak = 0;
    let sum = 0;
    for (let i = 0; i < vizSamples.length; i++) {
      const v = Math.abs(vizSamples[i]);
      peak = Math.max(peak, v);
      sum += vizSamples[i] * vizSamples[i];
    }
    const rms = Math.sqrt(sum / vizSamples.length);
    const tags: string[] = [];
    if (durationSec < 2) tags.push("Too short");
    if (rms < 0.01) tags.push("Low volume");
    if (peak > 0.96) tags.push("Clipping risk");
    if (tags.length === 0) tags.push("Good quality");
    return { durationSec, rms, peak, tags };
  }, [vizSamples, vizSampleRate]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("stress_history_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setSessionHistory(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("stress_history_v1", JSON.stringify(sessionHistory.slice(0, 12)));
    } catch {}
  }, [sessionHistory]);

  useEffect(() => {
    let cancelled = false;
    async function ping() {
      const url = await resolveWorkingBackend();
      if (!cancelled) setApiOnline(url !== null);
    }
    ping();
    const id = window.setInterval(ping, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  async function analyze(blob: Blob) {
    if (analyzingRef.current) return;
    analyzingRef.current = true;
    setErrorMsg(null);
    setStatus("analyzing");
    setReportOpen(false);

    try {
      const url = await resolveWorkingBackend();
      if (!url) {
        throw new Error(
          [
            "The FastAPI backend is not running (nothing answered on port 8000).",
            "",
            "Easiest fix — stop this terminal, then from the frontend folder run:",
            "  npm run dev",
            "That starts Next.js and the API together.",
            "",
            "If you only started the website (npm run dev:web), open a second terminal:",
            "  npm run dev:backend",
            "",
            "Manual start (from the backend folder):",
            "  python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000",
            "  (On Windows you can use: py -3 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000)",
            "",
            "First-time Python deps:",
            "  cd backend && pip install -r requirements.txt",
            "",
            `Tried: ${BACKEND_URL_CANDIDATES.join(" and ")}`,
          ].join("\n")
        );
      }

      const data = await predictStress(blob, url);
      setResp(data);
      setStatus("done");
      setSessionHistory((prev) => [
        {
          id: `${Date.now()}`,
          at: new Date().toLocaleTimeString(),
          level: data.overall.stressLevel,
          confidence: data.overall.confidence,
          stressIndex: data.overall.stressIndex,
          durationSec: inputQuality.durationSec,
          modelType: data?.meta?.modelType,
        },
        ...prev,
      ]);
    } catch (e: any) {
      setStatus("error");
      const msg = e?.message ?? "Prediction failed";
      const looksStructured = msg.includes("\n");
      setErrorMsg(looksStructured ? msg : `Backend error: ${msg}`);
    } finally {
      analyzingRef.current = false;
    }
  }

  return (
    <div className="relative">
      <div className="mx-auto w-full max-w-7xl">
        <header className="sticky top-3 z-40 mb-5">
          <div className="glass-strong rounded-2xl border border-white/10 px-4 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-sm md:text-base font-semibold text-white/90 truncate">
                  AI Voice Stress Detection
                </div>
                <div
                  className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1"
                  title="FastAPI health check on port 8000"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      apiOnline === true
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                        : apiOnline === false
                          ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                          : "bg-amber-300 animate-pulse"
                    }`}
                  />
                  <span className="text-[10px] md:text-xs text-white/65 whitespace-nowrap">
                    {apiOnline === true
                      ? "API online"
                      : apiOnline === false
                        ? "API offline"
                        : "Checking API…"}
                  </span>
                </div>
              </div>
              <nav className="flex items-center gap-2 text-xs md:text-sm">
                <a href="#home" className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-white/80 hover:bg-white/10 transition">
                  Home
                </a>
                <a href="#features" className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-white/80 hover:bg-white/10 transition">
                  Features
                </a>
                <a href="#contact" className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-white/80 hover:bg-white/10 transition">
                  Contact
                </a>
              </nav>
            </div>
          </div>
        </header>

        <section id="home" className="scroll-mt-24">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-white/70">Competition-grade demo</div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              AI Voice Stress Detection System
            </h1>
            <p className="text-sm text-white/60 max-w-2xl">
              Upload a WAV or record live. The system extracts speech features (MFCC/Chroma/Mel) and predicts
              stress in real time with a futuristic UI.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Left: audio input */}
          <motion.section
            className="md:col-span-4 glass-strong rounded-2xl p-4 border border-white/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Audio Input</div>
                <div className="text-xs text-white/60">WAV only (stable demo)</div>
              </div>
              <div className="text-xs text-white/70">
                Status:{" "}
                <span className="font-semibold">
                  {status === "idle" ? "Ready" : status === "recording" ? "Recording" : status === "ready" ? "Captured" : status === "analyzing" ? "Analyzing" : status === "done" ? "Results" : "Error"}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <AudioRecorderWav
                analysisKey={analysisKey}
                onRecordingState={(s) => setStatus(s)}
                onError={(message) => {
                  setStatus("error");
                  setErrorMsg(message);
                }}
                onLiveSamples={(samples, sampleRate) => {
                  setVizSamples(samples);
                  setVizSampleRate(sampleRate);
                  if (samples.length > 0) {
                    let sum = 0;
                    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
                    const rms = Math.sqrt(sum / samples.length);
                    setLiveStress01(Math.max(0, Math.min(1, rms * 7.5)));
                  }
                }}
                onWavReady={(blob, samples, sampleRate) => {
                  setAudioBlob(blob);
                  setVizSamples(samples);
                  setVizSampleRate(sampleRate);
                  setStatus("ready");
                  setResp(null);
                  analyze(blob);
                }}
              />

              <UploadPanel
                analysisKey={analysisKey}
                onWavReady={(blob, samples, sampleRate) => {
                  setAudioBlob(blob);
                  setVizSamples(samples);
                  setVizSampleRate(sampleRate);
                  setStatus("ready");
                  setResp(null);
                  analyze(blob);
                }}
              />

              <div className="space-y-2">
                <button
                  onClick={() => audioBlob && analyze(audioBlob)}
                  disabled={!canAnalyze}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-400/40 via-fuchsia-400/30 to-rose-400/30 hover:from-cyan-400/55 hover:via-fuchsia-400/45 hover:to-rose-400/45 border border-white/10 px-4 py-3 transition disabled:opacity-50"
                >
                  Analyze Stress
                </button>
                <div className="text-xs text-white/60">
                  Tip: record 5-10 seconds of steady speech for best detection.
                </div>
                {errorMsg?.toLowerCase().includes("microphone permission denied") ? (
                  <div className="text-[11px] text-white/60 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                    Quick fix: click the lock icon in the browser address bar, set Microphone to <b>Allow</b>, then reload.
                  </div>
                ) : null}
                <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                  <div className="text-[11px] text-white/60">
                    Duration: {inputQuality.durationSec.toFixed(1)}s | RMS: {inputQuality.rms.toFixed(4)} | Peak:{" "}
                    {inputQuality.peak.toFixed(2)}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {inputQuality.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] rounded-full bg-white/10 border border-white/10 px-2 py-0.5 text-white/75"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    key="err"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 whitespace-pre-wrap leading-relaxed"
                  >
                    {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* Middle: summary */}
          <motion.section
            className="md:col-span-4 glass-strong rounded-2xl p-4 border border-white/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <div className="text-sm font-semibold text-white">Stress Summary</div>
            <div className="text-xs text-white/60 mt-1">Confidence + stress index</div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <StressGauge level={overallLevel} confidence={overallConfidence} />

              <div className="rounded-2xl glass p-4 border border-white/10">
                <div className="flex items-baseline justify-between">
                  <div className="text-sm text-white/70">Stress Index</div>
                  <div className="text-lg font-semibold">
                    {resp ? resp.overall.stressIndex.toFixed(2) : "—"}
                  </div>
                </div>
                <div className="mt-2 text-xs text-white/55">
                  Mode:{" "}
                  <span className="text-white/80 font-semibold">
                    {resp?.meta?.modelType ?? "—"}
                  </span>
                </div>
                <div className="mt-3">
                  <StressIndexMeter value={resp?.overall.stressIndex ?? 0} />
                </div>
                <div className="mt-2 text-xs text-white/60 leading-relaxed">
                  {resp ? resp.overall.explanation : "Run analysis to get an AI-generated stress explanation."}
                </div>
                {resp?.overall.emotionHint && resp.overall.emotionHint.trim().length > 0 ? (
                  <div className="mt-2 text-xs text-white/60">
                    Emotion Hint: <span className="text-white/80">{resp.overall.emotionHint}</span>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl glass p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white/90">Compare With Previous</div>
                </div>
                {resp && sessionHistory.length > 1 ? (
                  <div className="mt-2 text-xs text-white/70">
                    Previous index: {sessionHistory[1].stressIndex.toFixed(2)} ({sessionHistory[1].level}) | Delta:{" "}
                    {(resp.overall.stressIndex - sessionHistory[1].stressIndex).toFixed(2)}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-white/60">Run at least 2 analyses to compare.</div>
                )}
              </div>

              <div className="rounded-2xl glass p-4 border border-white/10">
                <div className="text-sm font-semibold text-white/90">Confidence (Low/Med/High)</div>
                <div className="mt-3">
                  <ConfidenceBars probabilities={overallProbs as any} />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Right: visuals */}
          <motion.section
            className="md:col-span-4 glass-strong rounded-2xl p-4 border border-white/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <div className="text-sm font-semibold text-white">Advanced Visualizations</div>
            <div className="text-xs text-white/60 mt-1">Live waveform + spectrogram preview</div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl glass p-3 border border-white/10">
                <div className="text-xs text-white/60 mb-2">Waveform</div>
                <WaveformCanvas samples={vizSamples} sampleRate={vizSampleRate} />
              </div>

              <div className="rounded-2xl glass p-3 border border-white/10">
                <div className="text-xs text-white/60 mb-2">Spectrogram</div>
                <SpectrogramCanvas samples={vizSamples} sampleRate={vizSampleRate} />
              </div>
            </div>
          </motion.section>
        </div>

        {/* Trend section */}
        <motion.section
          className="mt-4 rounded-2xl glass-strong p-4 border border-white/10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Stress Trend</div>
              <div className="text-xs text-white/60 mt-1">
                Timeline prediction windows + voice energy correlation
              </div>
            </div>
            <div>
              <button
                onClick={() => {
                  setReportOpen(true);
                  setAutoDownloadToken((t) => t + 1);
                }}
                disabled={!resp}
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50 transition"
              >
                View Report
              </button>
            </div>
          </div>

          <div className="mt-4">
            {resp ? <TrendChart timeline={resp.timeline} /> : <div className="h-72 flex items-center justify-center text-sm text-white/60">Analyze to render trend.</div>}
          </div>
        </motion.section>

        <WinningFeaturesSection
          resp={resp}
          liveStress01={liveStress01}
          inputDurationSec={inputQuality.durationSec}
        />

        <motion.section
          className="mt-4 rounded-2xl glass-strong p-4 border border-white/10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white">Session History</div>
            <button
              onClick={() => setSessionHistory([])}
              className="text-xs rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-white/70 hover:bg-white/10"
            >
              Clear
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {sessionHistory.length === 0 ? (
              <div className="text-xs text-white/60">No runs yet.</div>
            ) : (
              sessionHistory.slice(0, 6).map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white/75 flex items-center justify-between"
                >
                  <span>
                    {r.at} • {r.level} • idx {r.stressIndex.toFixed(2)} • conf {(r.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-white/55">{r.modelType ?? "—"}</span>
                </div>
              ))
            )}
          </div>
        </motion.section>
        </section>

        <section id="contact" className="scroll-mt-24 mt-6">
          <motion.div
            className="rounded-2xl glass-strong p-5 border border-white/10"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45 }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-white">Contact</div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <a
                  href="https://instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-white/80 hover:bg-white/10 transition"
                >
                  Instagram
                </a>
                <a
                  href="https://linkedin.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-white/80 hover:bg-white/10 transition"
                >
                  LinkedIn
                </a>
                <a
                  href="https://github.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-white/80 hover:bg-white/10 transition"
                >
                  GitHub
                </a>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-sm font-semibold text-white/90">Tejas Nivrutti Divase</div>
                <div className="mt-2 text-sm text-white/75">Email: tejasdivase2020@gmail.com</div>
                <div className="text-sm text-white/75">Contact: +91 97637 92336</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-sm font-semibold text-white/90">Sushmita Borgaonkar</div>
                <div className="mt-2 text-sm text-white/75">Contact: +91 93734 63554</div>
                <div className="text-sm text-white/50">Team Member</div>
              </div>
            </div>
            <div className="mt-4 border-t border-white/10 pt-3 flex items-center justify-between">
              <div className="text-xs text-white/60">AI Voice Stress Detection Project</div>
              <div className="text-xs text-white/45">Built by Team Tejas</div>
            </div>
          </motion.div>
        </section>
      </div>

      <AiThinkingOverlay open={status === "analyzing"} />
      <StressReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        resp={resp}
        autoDownloadToken={autoDownloadToken}
      />
    </div>
  );
}
