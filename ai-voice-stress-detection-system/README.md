# AI Voice Stress Detection System

Competition demo build (free/open-source stack).

## What’s included

- FastAPI backend: `/predict` accepts uploaded `.wav`, extracts MFCC/Chroma/Mel + runs `model.joblib`.
- Next.js (App Router) frontend: futuristic antigravity UI, waveform + FFT spectrogram, neon gauge, confidence bars, stress trend, and PDF report export.

## Backend

1. Create a virtual environment and install dependencies:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Put your model files in `backend/models/`:

- `model.joblib` (required)
- `scaler.joblib` (optional)
- `metadata.json` (recommended; already included as a template)

3. Run the API:

```powershell
uvicorn main:app --reload --port 8000
```

## Frontend

1. Install dependencies:

```powershell
cd frontend
npm install
```

2. Start the dev server:

```powershell
npm run dev
```

Frontend runs at `http://localhost:3000` and calls the backend at `http://localhost:8000`.

## Notes for mic recording

- The mic recorder outputs WAV (PCM16) entirely in your browser, so the backend stays stable and free from extra transcode steps.

