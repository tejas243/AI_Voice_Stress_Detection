"use client";

import React, { useEffect, useMemo, useRef } from "react";

export default function WaveformCanvas({
  samples,
  sampleRate,
}: {
  samples: Float32Array | null;
  sampleRate: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(0, 0, w, h);

    if (!samples || samples.length < 10) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "12px ui-sans-serif, system-ui";
      ctx.fillText("Waiting for audio...", 14, 26);
      return;
    }

    const secondsToShow = Math.min(6, Math.max(2, samples.length / sampleRate));
    const maxSamples = Math.floor(secondsToShow * sampleRate);
    const start = Math.max(0, samples.length - maxSamples);
    const view = samples.subarray(start);

    const maxPoints = Math.floor(w * 1.2);
    const bucketSize = Math.max(1, Math.floor(view.length / maxPoints));

    // NeOn gradient
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "rgba(34, 211, 238, 0.95)");
    grad.addColorStop(0.5, "rgba(168, 85, 247, 0.95)");
    grad.addColorStop(1, "rgba(244, 63, 94, 0.95)");

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const mid = h / 2;
    for (let i = 0; i < maxPoints; i++) {
      const from = i * bucketSize;
      const to = Math.min(view.length, from + bucketSize);
      let peak = 0;
      for (let j = from; j < to; j++) {
        const v = Math.abs(view[j]);
        if (v > peak) peak = v;
      }
      const x = (i / (maxPoints - 1)) * w;
      const y = mid - peak * (h * 0.42);
      if (i === 0) ctx.moveTo(x, mid);
      ctx.lineTo(x, y);
    }

    ctx.stroke();

    // Center line
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();
  }, [samples, sampleRate]);

  return <canvas ref={canvasRef} className="w-full h-[140px] rounded-xl" />;
}

