from pydantic import BaseModel, Field
from typing import List, Literal, Optional

# Input bounds protect the service from CPU/memory exhaustion (Prophet/XGBoost
# fitting cost grows with history length and horizon).
MAX_HISTORY_POINTS = 3650
MAX_HORIZON_DAYS = 365
MAX_EVAL_POINTS = 10000


class HistoryPoint(BaseModel):
    ds: str = Field(..., max_length=32)
    y: float = Field(..., allow_inf_nan=False)


class ForecastRequest(BaseModel):
    product_id: str = Field(..., min_length=1, max_length=128)
    history: List[HistoryPoint] = Field(..., max_length=MAX_HISTORY_POINTS)
    horizon_days: int = Field(default=30, ge=1, le=MAX_HORIZON_DAYS)
    model_preference: Literal["auto", "prophet", "xgboost"] = "auto"


class ForecastPoint(BaseModel):
    ds: str
    yhat: float
    yhat_upper: float
    yhat_lower: float


class ForecastResponse(BaseModel):
    product_id: str
    forecasts: List[ForecastPoint]
    model_used: str
    confidence_score: float
    mape: Optional[float] = None
    generated_at: str


class MAPERequest(BaseModel):
    actuals: List[float] = Field(..., max_length=MAX_EVAL_POINTS)
    predicted: List[float] = Field(..., max_length=MAX_EVAL_POINTS)


class MAPEResponse(BaseModel):
    mape: float
    accuracy_percent: float
