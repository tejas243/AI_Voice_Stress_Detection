export type StressLevel = "Low" | "Medium" | "High";

export type PredictResponse = {
  overall: {
    stressLevel: StressLevel;
    confidence: number;
    stressIndex: number;
    probabilities: Partial<Record<StressLevel, number>>;
    explanation: string;
    emotionHint?: string | null;
  };
  timeline: Array<{
    tStart: number;
    tEnd: number;
    stressLevel: StressLevel;
    confidence: number;
    probabilities: Partial<Record<StressLevel, number>>;
    energy: number;
  }>;
  meta: Record<string, any>;
};

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

export async function predictStress(file: File | Blob, backendUrl: string = DEFAULT_BACKEND_URL) {
  const form = new FormData();
  form.append("file", file as any, "upload.wav");

  const res = await fetch(`${backendUrl}/predict`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    // Best-effort: show FastAPI's JSON detail when available.
    try {
      const json = await res.json();
      const detail = json?.detail;
      throw new Error(detail ? String(detail) : `Request failed (${res.status})`);
    } catch {
      // Fallback to plain text.
      try {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      } catch {
        throw new Error(`Request failed (${res.status})`);
      }
    }
  }

  return (await res.json()) as PredictResponse;
}

