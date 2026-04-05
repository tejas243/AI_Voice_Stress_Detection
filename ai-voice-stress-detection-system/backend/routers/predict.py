from typing import Dict, List, Tuple

import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile

from schemas.predict_schemas import PredictResponse, StressLevel, WindowPrediction
from services.audio_features import (
    extract_timeline_features,
    load_audio_mono_from_bytes,
)
from services.model_loader import load_model_bundle, predict_probabilities


router = APIRouter()


def _argmax_label(probs: Dict[str, float]) -> str:
    return max(probs.keys(), key=lambda k: probs[k])


def _stress_index(probabilities: Dict[StressLevel, float]) -> float:
    # Tuned for competition demo UX: keeps values within 0..1.
    weights = {"Low": 0.2, "Medium": 0.65, "High": 1.0}
    return float(sum(probabilities[k] * weights[k] for k in ["Low", "Medium", "High"]))

def _canonical_indices(model_labels: List[str], canonical: List[str]) -> List[int]:
    """
    Ensures we always return probabilities for canonical ['Low','Medium','High'] in the UI.
    If metadata/model label order differs, we fall back to index order mapping.
    """
    # Direct match (case-sensitive)
    if all(c in model_labels for c in canonical):
        return [model_labels.index(c) for c in canonical]

    # Case-insensitive match (common for saved label variants)
    model_lower = [str(x).strip().lower() for x in model_labels]
    canonical_lower = [str(x).strip().lower() for x in canonical]
    if all(c in model_lower for c in canonical_lower):
        return [model_lower.index(c) for c in canonical_lower]
    if len(model_labels) >= len(canonical):
        # Fallback: assume model label order matches canonical order
        return list(range(len(canonical)))
    raise ValueError(
        f"Model must provide at least {len(canonical)} classes to map into {canonical}. Got: {model_labels}"
    )


def _normalize_map(m: Dict[str, float]) -> Dict[str, float]:
    s = sum(m.values()) or 1.0
    return {k: float(v) / s for k, v in m.items()}


def _make_probs_for_canonical(
    row: np.ndarray,
    model_labels: List[str],
    canonical: List[str],
) -> Dict[StressLevel, float]:
    indices = _canonical_indices(model_labels, canonical)
    probs = {canonical[i]: float(row[indices[i]]) for i in range(len(canonical))}
    probs_norm = _normalize_map(probs)
    # Convert to StressLevel-typed dict
    return {k: probs_norm[k] for k in canonical if k in ["Low", "Medium", "High"]}  # type: ignore[return-value]


def _make_explanation(
    overall_level: StressLevel,
    overall_confidence: float,
    energy_stats: Dict[str, float],
    centroid_stats: Dict[str, float],
) -> Tuple[str, str]:
    energy_std = energy_stats.get("energy_std", 0.0)
    centroid_std = centroid_stats.get("centroid_std", 0.0)

    # Simple, human-readable heuristic (free, no paid APIs).
    if overall_level == "High":
        explanation = (
            "The model detects elevated stress signals correlated with unstable energy patterns and "
            "more variable spectral characteristics across time windows."
        )
        if energy_std > 0.08 or centroid_std > 0.12:
            emotion_hint = "Likely increased arousal/effort during speech (energy + spectral variability)."
        else:
            emotion_hint = "High stress classification with consistent signal strength across windows."
        return explanation, emotion_hint

    if overall_level == "Medium":
        explanation = (
            "Moderate stress is indicated by mixed energy stability and intermediate spectral behavior "
            "across the analyzed windows."
        )
        emotion_hint = "Some agitation markers detected, but not consistently throughout."
        return explanation, emotion_hint

    explanation = (
        "Lower stress indicators are observed with steadier energy and smoother spectral characteristics "
        "across the analyzed windows."
    )
    emotion_hint = "Calmer speech dynamics (lower variability in energy/spectrum)."
    return explanation, emotion_hint


@router.post("/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)) -> PredictResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file received.")

    if not file.filename.lower().endswith(".wav"):
        # For a competition demo, keep backend strict for reliability.
        raise HTTPException(status_code=400, detail="Please upload a .wav file.")

    try:
        audio_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read upload: {e}")

    canonical: List[str] = ["Low", "Medium", "High"]
    model_available = True
    bundle = None

    try:
        bundle = load_model_bundle()
        model_metadata = bundle.get("metadata") or {}
        labels = bundle["labels"]
        if len(labels) < 2:
            raise ValueError("Model labels are missing/invalid in metadata.json.")
    except FileNotFoundError:
        # Keep the frontend demo running even if you haven't dropped model.joblib yet.
        model_available = False
        model_metadata = {}
        labels = canonical
    except Exception:
        model_available = False
        model_metadata = {}
        labels = canonical

    feature_params = model_metadata.get("feature_params") or {}
    window_params = model_metadata.get("window_params") or {}

    target_sr = int(feature_params.get("target_sr") or 16000)
    window_seconds = float(window_params.get("window_seconds") or 1.5)
    hop_seconds = float(window_params.get("hop_seconds") or 0.75)

    n_mfcc = int(feature_params.get("n_mfcc") or 13)
    n_mels = int(feature_params.get("n_mels") or 40)
    n_fft = int(feature_params.get("n_fft") or 2048)
    hop_length = int(feature_params.get("hop_length") or 512)

    try:
        y, sr = load_audio_mono_from_bytes(audio_bytes, target_sr=target_sr)
        X, windows_meta = extract_timeline_features(
            y,
            sr,
            window_seconds=window_seconds,
            hop_seconds=hop_seconds,
            n_mfcc=n_mfcc,
            n_mels=n_mels,
            n_fft=n_fft,
            hop_length=hop_length,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Audio decoding/feature extraction failed: {e}")

    # Global signal cues used to improve heuristic behavior on short/loud clips.
    global_rms = float(np.sqrt(np.mean(np.square(y.astype(np.float32))) + 1e-9))
    global_peak = float(np.max(np.abs(y.astype(np.float32))) if len(y) > 0 else 0.0)

    # Run prediction (ML if model.joblib exists, otherwise heuristic fallback).
    prob_labels: List[str] = canonical
    model_labels: List[str] = canonical
    proba: np.ndarray

    if model_available:
        try:
            proba, prob_labels = predict_probabilities(X)
            model_labels = list(prob_labels)
            if list(prob_labels) != list(labels):
                model_labels = list(prob_labels)
        except Exception as e:
            model_available = False
            proba = np.zeros((X.shape[0], 3), dtype=np.float32)
    else:
        # Heuristic stress calibration using absolute acoustic cues.
        # This avoids collapsing to "Medium" for most uploaded files.
        energies_arr = np.array([float(w.get("energy", 0.0)) for w in windows_meta], dtype=float)
        centroid_std_arr = np.array([float(w.get("centroid_std", 0.0)) for w in windows_meta], dtype=float)
        zcr_arr = np.array([float(w.get("zcr_mean", 0.0)) for w in windows_meta], dtype=float)

        def softmax3(a: float, b: float, c: float) -> np.ndarray:
            logits = np.array([a, b, c], dtype=float)
            logits = logits - float(np.max(logits))
            ex = np.exp(logits)
            return ex / (float(np.sum(ex)) + 1e-12)

        # Convert RMS to dBFS and map into [0..1] score.
        # Quiet around -45 dBFS -> low; loud around -18 dBFS -> high.
        db_arr = 20.0 * np.log10(energies_arr + 1e-9)
        energy_score = np.clip((db_arr + 45.0) / 27.0, 0.0, 1.0)
        # Spectral variability and noisiness cues
        centroid_score = np.clip((centroid_std_arr - 70.0) / 260.0, 0.0, 1.0)
        zcr_score = np.clip((zcr_arr - 0.045) / 0.12, 0.0, 1.0)

        stressiness = 0.58 * energy_score + 0.27 * centroid_score + 0.15 * zcr_score
        stressiness = np.clip(stressiness, 0.0, 1.0)

        # Global loudness/peak boost so shouted audio maps to High.
        if global_peak >= 0.9 or global_rms >= 0.12:
            stressiness = np.clip(stressiness + 0.18, 0.0, 1.0)
        elif global_peak >= 0.8 or global_rms >= 0.08:
            stressiness = np.clip(stressiness + 0.10, 0.0, 1.0)

        # Build probabilities around fixed class centers.
        low_c, med_c, high_c = 0.2, 0.5, 0.8
        rows = []
        for s in stressiness:
            s_f = float(s)
            # closer center => higher logit
            logit_low = -abs(s_f - low_c) * 7.5
            logit_med = -abs(s_f - med_c) * 7.0
            logit_high = -abs(s_f - high_c) * 7.5
            rows.append(softmax3(logit_low, logit_med, logit_high))

        proba = np.stack(rows, axis=0).astype(np.float32, copy=False)

    # Convert timeline
    timeline: List[WindowPrediction] = []
    energies = []
    for i, w in enumerate(windows_meta):
        row = proba[i]
        probs_map = _make_probs_for_canonical(row=row, model_labels=model_labels, canonical=canonical)
        top_label = _argmax_label({k: probs_map[k] for k in canonical})
        top_conf = float(probs_map[top_label])  # type: ignore[index]
        energies.append(float(w.get("energy", 0.0)))

        stress_level: StressLevel = top_label  # type: ignore[assignment]

        timeline.append(
            WindowPrediction(
                tStart=float(w["tStart"]),
                tEnd=float(w["tEnd"]),
                stressLevel=stress_level,
                confidence=top_conf,
                probabilities=probs_map,  # type: ignore[arg-type]
                energy=float(w.get("energy", 0.0)),
            )
        )

    indices = _canonical_indices(model_labels, canonical)
    # Use mean window probabilities for overall calibration.
    # Energy-weighted averaging can bias strongly toward "High" even for mild input.
    overall_probs_canonical = proba[:, indices].mean(axis=0)  # shape (3,)
    overall_probs_map: Dict[StressLevel, float] = _normalize_map(
        {canonical[i]: float(overall_probs_canonical[i]) for i in range(len(canonical))}
    )  # type: ignore[assignment]

    overall_top_label = max(overall_probs_map.keys(), key=lambda k: overall_probs_map[k])  # type: ignore[arg-type]
    overall_confidence = float(overall_probs_map[overall_top_label])
    overall_index = _stress_index(overall_probs_map)

    energies_np = np.array(energies, dtype=float)
    energy_stats = {
        "energy_mean": float(np.mean(energies_np)),
        "energy_std": float(np.std(energies_np)),
    }
    centroid_std = float(
        np.std([w.get("centroid_std", 0.0) for w in windows_meta], dtype=float)
    )
    centroid_stats = {"centroid_std": centroid_std}

    explanation, emotion_hint = _make_explanation(
        overall_level=overall_top_label,
        overall_confidence=overall_confidence,
        energy_stats=energy_stats,
        centroid_stats=centroid_stats,
    )

    if not model_available:
        # Replace generic disclaimer with useful, judge-friendly measurable stats.
        duration_s = float(windows_meta[-1]["tEnd"]) if windows_meta else 0.0
        n_windows = int(len(windows_meta))
        centroid_mean = float(np.mean([w.get("centroid_mean", 0.0) for w in windows_meta], dtype=float)) if windows_meta else 0.0
        centroid_std_mean = float(np.mean([w.get("centroid_std", 0.0) for w in windows_meta], dtype=float)) if windows_meta else 0.0

        # A simple stability score (lower = more stable)
        stability = float(0.6 * energy_stats["energy_std"] + 0.4 * (centroid_std_mean / 200.0))

        explanation = (
            f"Analysis summary (heuristic mode): duration={duration_s:.1f}s, windows={n_windows}. "
            f"Energy(mean={energy_stats['energy_mean']:.4f}, std={energy_stats['energy_std']:.4f}), "
            f"Spectral centroid(mean={centroid_mean:.1f}Hz), variability(avg centroid std={centroid_std_mean:.1f}Hz). "
            f"Stability score={stability:.3f}."
        )

        # Remove emotion hint in heuristic mode (replace with objective metrics only).
        emotion_hint = ""

    response = PredictResponse(
        overall={
            "stressLevel": overall_top_label,
            "confidence": overall_confidence,
            "stressIndex": overall_index,
            "probabilities": overall_probs_map,  # type: ignore[arg-type]
            "explanation": explanation,
            "emotionHint": emotion_hint,
        },
        timeline=timeline,
        meta={
            "sampleRate": sr,
            "windowSeconds": window_seconds,
            "hopSeconds": hop_seconds,
            "featureParams": {
                "n_mfcc": n_mfcc,
                "n_mels": n_mels,
                "n_fft": n_fft,
                "hop_length": hop_length,
                "target_sr": target_sr,
            },
            "labels": canonical,
            "featureVersion": model_metadata.get("featureVersion") or "v1",
            "modelType": "ml" if model_available else "heuristic",
        },
    )

    return response

