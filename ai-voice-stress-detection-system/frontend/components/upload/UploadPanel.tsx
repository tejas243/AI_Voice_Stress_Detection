"use client";

import React, { useEffect, useRef, useState } from "react";

export default function UploadPanel({
  analysisKey,
  onWavReady,
}: {
  analysisKey: number;
  onWavReady: (blob: Blob, samples: Float32Array, sampleRate: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Reset file input on reanalyze
    if (inputRef.current) inputRef.current.value = "";
    setBusy(false);
  }, [analysisKey]);

  const decodeWavSamples = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextCtor();

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const ch0 = audioBuffer.getChannelData(0);
    const samples = new Float32Array(ch0); // copy
    const sampleRate = audioBuffer.sampleRate;

    try {
      await audioCtx.close();
    } catch {}

    return { samples, sampleRate };
  };

  const onFileChange = async (f?: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".wav")) {
      alert("Please upload a .wav file.");
      return;
    }

    setBusy(true);
    try {
      const { samples, sampleRate } = await decodeWavSamples(f);
      onWavReady(f, samples, sampleRate);
      // Allow selecting the same file again (important for repeated testing).
      if (inputRef.current) inputRef.current.value = "";
    } catch (e: any) {
      alert(e?.message ?? "Failed to decode audio.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Upload WAV</div>
        <div className="text-xs text-white/60">{busy ? "Decoding..." : "Local only"}</div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".wav,audio/wav"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        disabled={busy}
        className="block w-full text-sm file:mr-4 file:rounded-xl file:bg-white/10 file:border file:border-white/10 file:px-4 file:py-2 file:text-white/80 disabled:opacity-50"
      />

      <div className="text-xs text-white/55">
        Upload is decoded in your browser for visualizations. Prediction runs on the FastAPI backend.
      </div>
    </div>
  );
}

