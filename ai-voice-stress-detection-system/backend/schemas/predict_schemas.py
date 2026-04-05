from typing import Dict, List, Optional, Literal
from pydantic import BaseModel


StressLevel = Literal["Low", "Medium", "High"]


class WindowPrediction(BaseModel):
    tStart: float
    tEnd: float
    stressLevel: StressLevel
    confidence: float
    probabilities: Dict[StressLevel, float]
    energy: float


class OverallPrediction(BaseModel):
    stressLevel: StressLevel
    confidence: float
    stressIndex: float
    probabilities: Dict[StressLevel, float]
    explanation: str
    emotionHint: Optional[str] = None


class PredictResponse(BaseModel):
    overall: OverallPrediction
    timeline: List[WindowPrediction]
    meta: Dict[str, object]

