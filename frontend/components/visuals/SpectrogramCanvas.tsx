"use client";

import React, { useEffect, useMemo, useRef } from "react";

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export default function SpectrogramCanvas({
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

    let cancelled = false;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(0, 0, w, h);

    if (!samples || samples.length < 2048) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "12px ui-sans-serif, system-ui";
      ctx.fillText("Spectrogram preview...", 14, 26);
      return;
    }

    (async () => {
      try {
        // Dynamic import avoids `require is not defined` runtime issues.
        const fftJsMod: any = await import("fft-js");
        if (cancelled) return;

        const fftFn = fftJsMod?.fft ?? fftJsMod?.default?.fft;
        const util = fftJsMod?.util ?? fftJsMod?.default?.util;
        if (!fftFn || !util) return;

        const fft = fftFn as (arr: number[]) => any[];

        const frameSize = 1024; // power of two
        const hop = 256;
        const maxColumns = 120;
        const maxBinsToRender = 256;

        const maxSecondsToShow = 6;
        const maxSamples = Math.min(samples.length, Math.floor(maxSecondsToShow * sampleRate));
        const start = Math.max(0, samples.length - maxSamples);
        const view = samples.subarray(start);

        const possibleColumns = Math.max(0, Math.floor((view.length - frameSize) / hop));
        const columns = Math.max(1, Math.min(maxColumns, possibleColumns));

        const hann = new Float32Array(frameSize);
        for (let n = 0; n < frameSize; n++) {
          hann[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (frameSize - 1));
        }

        const magnitudesDB: number[][] = [];
        let globalMin = Infinity;
        let globalMax = -Infinity;

        for (let col = 0; col < columns; col++) {
          const from = col * hop;
          const frame = view.subarray(from, from + frameSize);
          const windowed = new Array<number>(frameSize);
          for (let i = 0; i < frameSize; i++) windowed[i] = frame[i] * hann[i];

          const phasors = fft(windowed);
          const mags = util.fftMag(phasors) as number[];
          // Only positive frequencies (up to Nyquist)
          const half = Math.floor(mags.length / 2);
          const usableBins = Math.min(half, maxBinsToRender);
          const dbRow: number[] = new Array(usableBins);
          for (let b = 0; b < usableBins; b++) {
            const mag = mags[b];
            const db = 20 * Math.log10(mag + 1e-10);
            dbRow[b] = db;
            globalMin = Math.min(globalMin, db);
            globalMax = Math.max(globalMax, db);
          }
          magnitudesDB.push(dbRow);
        }

        if (cancelled) return;

        // Normalize for color mapping
        const range = Math.max(1e-6, globalMax - globalMin);

        // draw: each column is 1-2 pixels wide
        const bins = magnitudesDB[0]?.length ?? 0;
        const denom = Math.max(1, bins - 1);
        const binToY = (binIdx: number) => {
          // low bins at bottom
          const y = h - (binIdx / denom) * h;
          return y;
        };

        for (let col = 0; col < columns; col++) {
          const x = (col / Math.max(1, columns - 1)) * w;
          const row = magnitudesDB[col];
          const pxWidth = Math.max(1, Math.floor(w / columns));

          for (let b = 0; b < bins; b++) {
            const norm = (row[b] - globalMin) / range; // 0..1
            const alpha = clamp(norm, 0, 1);
            // Neon-ish palette: cyan -> purple -> pink
            const r = Math.floor(255 * (0.25 + 0.75 * alpha) * (0.65 + 0.35 * alpha));
            const g = Math.floor(255 * (0.55 + 0.45 * alpha));
            const bl = Math.floor(255 * (0.3 + 0.7 * (1 - Math.abs(alpha - 0.6))));

            ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, ${0.08 + alpha * 0.85})`;
            const y = binToY(b);
            ctx.fillRect(x, y, pxWidth, Math.max(1, h / Math.max(1, bins)));
          }
        }

        // Overlay grid lines
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
          const yy = (i / 5) * h;
          ctx.beginPath();
          ctx.moveTo(0, yy);
          ctx.lineTo(w, yy);
          ctx.stroke();
        }
      } catch {
        // If fft-js fails to load, keep the canvas with placeholder state.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [samples, sampleRate]);

  return <canvas ref={canvasRef} className="w-full h-[190px] rounded-xl" />;
}

