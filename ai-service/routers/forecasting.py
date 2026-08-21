from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime, timezone
import pandas as pd

from schemas.forecast import ForecastRequest, ForecastResponse, MAPERequest, MAPEResponse
from services.evaluator import ModelEvaluator
from services.prophet_model import ProphetForecaster
from services.xgboost_model import XGBoostForecaster

router = APIRouter()

@router.post("/forecast", response_model=ForecastResponse)
def forecast(request: ForecastRequest):
    history_len = len(request.history)
    
    if history_len < 5:
        raise HTTPException(status_code=400, detail="Insufficient data: minimum 5 days required")
        
    df = pd.DataFrame([{"ds": h.ds, "y": h.y} for h in request.history])
    
    # Model Selection
    model_name = request.model_preference
    if model_name == "auto":
        model_name = ModelEvaluator.select_best_model(history_len)
        
    confidence_score = 0.5
    mape = None
    forecast_points = []
    
    if model_name == "prophet":
        model = ProphetForecaster()
        model.fit(df)
        forecast_points = model.predict(request.horizon_days)
        confidence_score = model.get_confidence_score(history_len)
    else:
        model_name = "xgboost"
        model = XGBoostForecaster()
        model.fit(df)
        forecast_points = model.predict(request.horizon_days)
        
        # Simple confidence rule for xgboost based on history len
        if history_len < 30:
            confidence_score = 0.4
        elif history_len <= 90:
            confidence_score = 0.6
        else:
            confidence_score = 0.75
            
    # Calculate MAPE if history > 30
    if history_len > 30:
        split_idx = int(history_len * 0.8)
        train_df = df.iloc[:split_idx]
        test_df = df.iloc[split_idx:]
        
        test_horizon = len(test_df)
        
        if model_name == "prophet":
            eval_model = ProphetForecaster()
            eval_model.fit(train_df)
            eval_preds = eval_model.predict(test_horizon)
        else:
            eval_model = XGBoostForecaster()
            eval_model.fit(train_df)
            eval_preds = eval_model.predict(test_horizon)
            
        predicted_vals = [p["yhat"] for p in eval_preds]
        actual_vals = test_df['y'].tolist()
        
        mape, _ = ModelEvaluator.calculate_mape(actual_vals, predicted_vals)
        
    return ForecastResponse(
        product_id=request.product_id,
        forecasts=forecast_points,
        model_used=model_name,
        confidence_score=confidence_score,
        mape=mape,
        generated_at=datetime.now(timezone.utc).isoformat()
    )

@router.post("/batch-forecast", response_model=List[ForecastResponse])
def batch_forecast(requests: List[ForecastRequest]):
    if len(requests) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 products per batch")
        
    responses = []
    for req in requests:
        try:
            res = forecast(req)
            responses.append(res)
        except Exception as e:
            # Skip failed items in batch
            print(f"Error forecasting {req.product_id}: {str(e)}")
            
    return responses

@router.post("/evaluate", response_model=MAPEResponse)
def evaluate(request: MAPERequest):
    mape, accuracy = ModelEvaluator.calculate_mape(request.actuals, request.predicted)
    return MAPEResponse(mape=mape, accuracy_percent=accuracy)

@router.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}
