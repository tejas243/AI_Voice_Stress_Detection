from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.predict import router as predict_router


app = FastAPI(title="AI Voice Stress Detection API", version="1.0.0")

# Competition demo friendly: allow local dev + production build.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        # Keep explicit origins to avoid wildcard+credentials CORS issues.
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router, prefix="")


@app.get("/health")
def health():
    return {"status": "ok"}

