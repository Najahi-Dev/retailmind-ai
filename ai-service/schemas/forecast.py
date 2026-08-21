from pydantic import BaseModel
from typing import List, Optional

class HistoryPoint(BaseModel):
    ds: str
    y: float

class ForecastRequest(BaseModel):
    product_id: str
    history: List[HistoryPoint]
    horizon_days: int = 30
    model_preference: str = "auto"

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
    actuals: List[float]
    predicted: List[float]

class MAPEResponse(BaseModel):
    mape: float
    accuracy_percent: float
