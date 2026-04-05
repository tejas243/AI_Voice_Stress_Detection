import json
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np


def _softmax(x: np.ndarray) -> np.ndarray:
    x = x - np.max(x)
    e = np.exp(x)
    return e / (np.sum(e) + 1e-12)


@lru_cache(maxsize=1)
def load_model_bundle() -> Dict[str, Any]:
    base_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    base_dir = os.path.abspath(base_dir)

    model_path = os.path.join(base_dir, "model.joblib")
    scaler_path = os.path.join(base_dir, "scaler.joblib")
    metadata_path = os.path.join(base_dir, "metadata.json")

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            "Missing model.joblib in backend/models/. Put your trained joblib model there."
        )

    model = joblib.load(model_path)

    scaler = None
    if os.path.exists(scaler_path):
        scaler = joblib.load(scaler_path)

    metadata: Dict[str, Any] = {}
    if os.path.exists(metadata_path):
        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)

    labels = metadata.get("labels") or ["Low", "Medium", "High"]

    return {
        "model": model,
        "scaler": scaler,
        "metadata": metadata,
        "labels": labels,
        "model_path": model_path,
    }


def predict_probabilities(X: np.ndarray) -> Tuple[np.ndarray, List[str]]:
    """
    Returns probabilities shaped (n_samples, n_classes)
    """
    bundle = load_model_bundle()
    model = bundle["model"]
    scaler = bundle["scaler"]
    labels: List[str] = bundle["labels"]

    if scaler is not None:
        X = scaler.transform(X)

    # Standard: sklearn classifiers
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)
        return proba, labels

    # Fallback: decision_function -> softmax
    if hasattr(model, "decision_function"):
        scores = model.decision_function(X)
        if scores.ndim == 1:
            # binary classification: map to two classes
            p1 = 1 / (1 + np.exp(-scores))
            proba = np.stack([1 - p1, p1], axis=1)
        else:
            proba = np.apply_along_axis(_softmax, 1, scores)
        return proba, labels

    # Last resort: predict only
    preds = model.predict(X)
    # Create one-hot probabilities
    idx = {lab: i for i, lab in enumerate(labels)}
    n_classes = len(labels)
    proba = np.zeros((X.shape[0], n_classes), dtype=float)
    for r, p in enumerate(preds):
        proba[r, idx.get(p, 0)] = 1.0
    return proba, labels

