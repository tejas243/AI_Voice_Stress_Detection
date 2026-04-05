"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

function encodeWavPCM16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  // 16-bit PCM WAV encoding
  const numChannels = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;

  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // RIFF header
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");

  // fmt chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // format = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp and scale to int16
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

export default function AudioRecorderWav({
  analysisKey,
  onRecordingState,
  onLiveSamples,
  onWavReady,
  onError,
}: {
  analysisKey: number;
  onRecordingState: (s: "idle" | "recording" | "ready") => void;
  onLiveSamples: (samples: Float32Array, sampleRate: number) => void;
  onWavReady: (blob: Blob, samples: Float32Array, sampleRate: number) => void;
  onError?: (message: string) => void;
}) {
  const [state, setState] = useState<"idle" | "recording">("idle");
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);

  const allSamplesRef = useRef<Float32Array[]>([]);

  // Ring-like recent buffers for live visualization.
  const recentBuffersRef = useRef<Float32Array[]>([]);
  const recentSamplesLimitSeconds = 4;

  const liveSampleRateRef = useRef<number>(16000);

  const lastLiveDrawAtRef = useRef<number>(0);

  useEffect(() => {
    // Reinitialize when analysisKey changes
    stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisKey]);

  const stopAll = () => {
    try {
      scriptNodeRef.current?.disconnect();
    } catch {}
    scriptNodeRef.current = null;

    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;

    try {
      audioCtxRef.current?.close();
    } catch {}
    audioCtxRef.current = null;

    allSamplesRef.current = [];
    recentBuffersRef.current = [];
    onRecordingState("idle");
    setState("idle");
  };

  const start = async () => {
    if (state === "recording") return;
    try {
      // First try enhanced constraints; if that fails (device/browser constraints),
      // fall back to plain audio request.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;

      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextCtor();
      audioCtxRef.current = audioCtx;

      liveSampleRateRef.current = audioCtx.sampleRate;

      const source = audioCtx.createMediaStreamSource(stream);
      const script = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptNodeRef.current = script;

      // Connect to a muted gain node so `onaudioprocess` fires without audio feedback.
      const gain = audioCtx.createGain();
      gain.gain.value = 0;
      script.connect(gain);
      gain.connect(audioCtx.destination);
      source.connect(script);

      const maxRecentSamples = Math.floor(recentSamplesLimitSeconds * audioCtx.sampleRate);

      script.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const chunk = new Float32Array(input); // copy
        allSamplesRef.current.push(chunk);

        recentBuffersRef.current.push(chunk);
        // Trim old recent buffers if total exceeds limit
        let total = 0;
        for (let i = 0; i < recentBuffersRef.current.length; i++) total += recentBuffersRef.current[i].length;
        while (total > maxRecentSamples && recentBuffersRef.current.length > 1) {
          const removed = recentBuffersRef.current.shift();
          if (removed) total -= removed.length;
        }

        const now = performance.now();
        if (now - lastLiveDrawAtRef.current > 150) {
          lastLiveDrawAtRef.current = now;
          // Flatten recent buffers for drawing
          const flat = new Float32Array(total);
          let off = 0;
          for (const b of recentBuffersRef.current) {
            flat.set(b, off);
            off += b.length;
          }
          onLiveSamples(flat, audioCtx.sampleRate);
        }
      };

      setState("recording");
      onRecordingState("recording");
    } catch (e: any) {
      stopAll();
      const name = String(e?.name || "");
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        onError?.(
          "Microphone permission denied. Allow mic access in browser site settings for localhost, then retry."
        );
        return;
      }
      if (name === "NotFoundError") {
        onError?.("No microphone device found. Connect a mic and retry.");
        return;
      }
      onError?.(e?.message || "Microphone unavailable. Use Upload WAV or retry after enabling mic access.");
    }
  };

  const stop = () => {
    if (state !== "recording") return;

    // Flatten all samples
    const chunks = allSamplesRef.current;
    let total = 0;
    for (const c of chunks) total += c.length;
    const flat = new Float32Array(total);
    let off = 0;
    for (const c of chunks) {
      flat.set(c, off);
      off += c.length;
    }

    const sr = liveSampleRateRef.current;
    const durationSec = total / Math.max(1, sr);
    if (durationSec < 0.7) {
      stopAll();
      onError?.("Recording too short. Please record at least 1 second.");
      return;
    }
    const wavBuffer = encodeWavPCM16(flat, sr);
    const blob = new Blob([wavBuffer], { type: "audio/wav" });

    stopAll();

    onWavReady(blob, flat, sr);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/70">Live Microphone</div>
        <div className="text-xs font-semibold">
          {state === "idle" ? "Ready" : "Recording..."}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={start}
          disabled={state === "recording"}
          className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2 transition disabled:opacity-50 text-sm"
        >
          Start
        </button>
        <button
          onClick={stop}
          disabled={state !== "recording"}
          className="rounded-xl bg-gradient-to-r from-cyan-400/30 to-fuchsia-400/30 hover:from-cyan-400/40 hover:to-fuchsia-400/40 px-4 py-2 transition disabled:opacity-50 text-sm"
        >
          Stop
        </button>
      </div>

      <div className="text-xs text-white/55">
        Free demo recorder. Output is WAV (PCM16) for reliable backend feature extraction.
      </div>
    </div>
  );
}

