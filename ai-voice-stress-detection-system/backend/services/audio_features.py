import os
import tempfile
import uuid
from typing import Any, Dict, List, Optional, Tuple

import librosa
import numpy as np


def load_audio_mono_from_bytes(audio_bytes: bytes, target_sr: int = 16000) -> Tuple[np.ndarray, int]:
    """
    Decode audio bytes into a mono float32 waveform using librosa.
    """
    # On Windows, `NamedTemporaryFile` can keep the file handle open,
    # causing `librosa.load()` to fail with Permission denied.
    tmp_name = os.path.join(tempfile.gettempdir(), f"voice_{uuid.uuid4().hex}.wav")
    try:
        with open(tmp_name, "wb") as f:
            f.write(audio_bytes)
        y, sr = librosa.load(tmp_name, sr=target_sr, mono=True)
        y = y.astype(np.float32, copy=False)
        return y, int(sr)
    finally:
        try:
            os.remove(tmp_name)
        except OSError:
            pass


def _mean_std(a: np.ndarray, axis: int = 1, eps: float = 1e-9) -> np.ndarray:
    mean = np.mean(a, axis=axis)
    std = np.std(a, axis=axis) + eps
    return np.concatenate([mean, std], axis=0).astype(np.float32, copy=False)


def extract_window_features(
    y: np.ndarray,
    sr: int,
    n_mfcc: int = 13,
    n_mels: int = 40,
    n_fft: int = 2048,
    hop_length: int = 512,
    eps: float = 1e-9,
) -> np.ndarray:
    """
    Produces a fixed-length feature vector using:
    - MFCC mean+std
    - Chroma mean+std
    - Log-mel (dB) mean+std
    """
    # MFCC
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc, n_fft=n_fft, hop_length=hop_length)

    # Chroma (from stft)
    chroma = librosa.feature.chroma_stft(y=y, sr=sr, n_chroma=12, n_fft=n_fft, hop_length=hop_length)

    # Mel spectrogram -> log scale
    mel = librosa.feature.melspectrogram(
        y=y,
        sr=sr,
        n_mels=n_mels,
        n_fft=n_fft,
        hop_length=hop_length,
        power=2.0,
    )
    mel_db = librosa.power_to_db(mel, ref=np.max)

    feats_mfcc = _mean_std(mfcc, axis=1, eps=eps)
    feats_chroma = _mean_std(chroma, axis=1, eps=eps)
    feats_mel = _mean_std(mel_db, axis=1, eps=eps)

    return np.concatenate([feats_mfcc, feats_chroma, feats_mel], axis=0).astype(np.float32, copy=False)


def rms_energy(y: np.ndarray, eps: float = 1e-9) -> float:
    return float(np.sqrt(np.mean(np.square(y.astype(np.float32))) + eps))


def extract_timeline_features(
    y: np.ndarray,
    sr: int,
    window_seconds: float = 1.5,
    hop_seconds: float = 0.75,
    n_mfcc: int = 13,
    n_mels: int = 40,
    n_fft: int = 2048,
    hop_length: int = 512,
) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
    """
    Returns:
      X: (n_windows, feature_dim)
      windows: list of window descriptors with time bounds + energy + centroid stats
    """
    win = int(window_seconds * sr)
    hop = int(hop_seconds * sr)
    win = max(win, 256)
    hop = max(hop, 64)

    # Ensure we create at least one window
    if len(y) < win:
        padded = np.pad(y, (0, win - len(y)), mode="constant")
        X = np.expand_dims(
            extract_window_features(
                padded,
                sr,
                n_mfcc=n_mfcc,
                n_mels=n_mels,
                n_fft=n_fft,
                hop_length=hop_length,
            ),
            axis=0,
        )
        energy = rms_energy(padded)
        return X, [
            {
                "tStart": 0.0,
                "tEnd": win / sr,
                "energy": energy,
            }
        ]

    X_list: List[np.ndarray] = []
    windows: List[Dict[str, Any]] = []

    # Precompute cadence windows
    start = 0
    while start < len(y):
        end = start + win
        if end > len(y):
            seg = np.pad(y[start:], (0, end - len(y)), mode="constant")
        else:
            seg = y[start:end]

        X_list.append(
            extract_window_features(
                seg,
                sr,
                n_mfcc=n_mfcc,
                n_mels=n_mels,
                n_fft=n_fft,
                hop_length=hop_length,
            )
        )

        energy = rms_energy(seg)

        # Optional metrics for explanations
        centroid = librosa.feature.spectral_centroid(y=seg, sr=sr, n_fft=n_fft, hop_length=hop_length)
        centroid_mean = float(np.mean(centroid))
        centroid_std = float(np.std(centroid))
        zcr = librosa.feature.zero_crossing_rate(seg, hop_length=hop_length)
        zcr_mean = float(np.mean(zcr))

        windows.append(
            {
                "tStart": start / sr,
                "tEnd": end / sr,
                "energy": energy,
                "centroid_mean": centroid_mean,
                "centroid_std": centroid_std,
                "zcr_mean": zcr_mean,
            }
        )

        if end >= len(y):
            break
        start += hop

    X = np.stack(X_list, axis=0).astype(np.float32, copy=False)
    return X, windows

