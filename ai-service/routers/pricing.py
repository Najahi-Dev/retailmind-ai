from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import numpy as np

router = APIRouter()

class PricingRequest(BaseModel):
    product_id:    str
    current_price: float
    cost_price:    float
    on_hand:       int
    reorder_point: int
    safety_stock:  int
    avg_daily_sales: float        # from stock movement history
    forecast_demand: float        # from Prophet output
    category:      str
    peak_months:   list[int]      # seasonal config
    current_month: int

class PricingResponse(BaseModel):
    product_id:      str
    suggested_price: float
    price_change:    float        # percentage
    direction:       str
    reason:          str
    confidence:      float
    factors:         dict

@router.post("/price", response_model=PricingResponse)
async def suggest_price(req: PricingRequest):

    # ── Factor 1: Stock Level ─────────────────
    if req.on_hand <= req.safety_stock:
        stock_factor  = 1.15   # +15% — very low stock
        stock_level   = "critical"
        stock_signal  = "increase"
    elif req.on_hand <= req.reorder_point:
        stock_factor  = 1.08   # +8%
        stock_level   = "low"
        stock_signal  = "increase"
    elif req.on_hand >= req.reorder_point * 4:
        stock_factor  = 0.92   # -8% — overstock
        stock_level   = "overstock"
        stock_signal  = "decrease"
    else:
        stock_factor  = 1.0
        stock_level   = "healthy"
        stock_signal  = "maintain"

    # ── Factor 2: Demand Trend ────────────────
    if req.avg_daily_sales > 0:
        demand_ratio = req.forecast_demand / req.avg_daily_sales
    else:
        demand_ratio = 1.0

    if demand_ratio >= 1.3:
        demand_factor = 1.10   # demand rising +10%
        demand_trend  = "rising"
    elif demand_ratio <= 0.7:
        demand_factor = 0.93   # demand falling -7%
        demand_trend  = "falling"
    else:
        demand_factor = 1.0
        demand_trend  = "stable"

    # ── Factor 3: Seasonality ─────────────────
    if req.current_month in req.peak_months:
        seasonal_factor = 1.12  # peak season +12%
        seasonality     = "peak"
    elif any(
        abs(req.current_month - m) == 1
        for m in req.peak_months
    ):
        seasonal_factor = 1.05  # near peak +5%
        seasonality     = "near-peak"
    else:
        seasonal_factor = 1.0
        seasonality     = "off-peak"

    # ── Factor 4: Days of Stock ───────────────
    if req.avg_daily_sales > 0:
        days_of_stock = req.on_hand / req.avg_daily_sales
    else:
        days_of_stock = 999

    if days_of_stock < 7:
        urgency_factor = 1.08   # very urgent — raise price
    elif days_of_stock > 90:
        urgency_factor = 0.95   # too much stock — lower price
    else:
        urgency_factor = 1.0

    # ── Combined price multiplier ─────────────
    combined = (
        stock_factor   * 0.35 +   # 35% weight
        demand_factor  * 0.30 +   # 30% weight
        seasonal_factor* 0.25 +   # 25% weight
        urgency_factor * 0.10     # 10% weight
    )

    # ── Apply to current price ────────────────
    raw_suggested = req.current_price * combined

    # ── Price floors and caps ─────────────────
    min_price = req.cost_price * 1.05   # min 5% margin
    max_price = req.current_price * 1.30 # max 30% increase

    suggested_price = max(min_price, min(max_price, raw_suggested))
    suggested_price = round(suggested_price, 2)

    # ── Price change % ────────────────────────
    price_change = ((suggested_price - req.current_price)
                    / req.current_price) * 100
    price_change = round(price_change, 2)

    # ── Direction ────────────────────────────
    if price_change > 1:
        direction = "increase"
    elif price_change < -1:
        direction = "decrease"
    else:
        direction   = "maintain"
        suggested_price = req.current_price
        price_change    = 0.0

    # ── Confidence score ──────────────────────
    # Higher confidence when multiple factors agree
    signals = [stock_signal, demand_trend]
    if signals.count("increase") == 2:
        confidence = 0.90
    elif signals.count("decrease") == 2:
        confidence = 0.88
    elif "maintain" in signals:
        confidence = 0.75
    else:
        confidence = 0.65   # mixed signals

    # ── Plain English reason ──────────────────
    reasons = []
    if stock_level in ["critical", "low"]:
        reasons.append(f"stock is {stock_level} ({req.on_hand} units)")
    if demand_trend == "rising":
        reasons.append("demand is trending upward")
    if demand_trend == "falling":
        reasons.append("demand is slowing down")
    if seasonality == "peak":
        reasons.append("currently in peak season")
    if days_of_stock < 7:
        reasons.append(f"only {int(days_of_stock)} days of stock remaining")
    if stock_level == "overstock":
        reasons.append(f"excess inventory ({req.on_hand} units on hand)")

    if direction == "maintain":
        reason = "All market signals are stable. Current price is optimal."
    elif reasons:
        reason = f"Suggested {'increase' if direction == 'increase' else 'reduction'} because {', '.join(reasons)}."
    else:
        reason = f"Minor price {'increase' if direction == 'increase' else 'reduction'} based on market conditions."

    return PricingResponse(
        product_id      = req.product_id,
        suggested_price = suggested_price,
        price_change    = price_change,
        direction       = direction,
        reason          = reason,
        confidence      = confidence,
        factors         = {
            "stockLevel":   stock_level,
            "demandTrend":  demand_trend,
            "seasonality":  seasonality,
            "daysOfStock":  round(days_of_stock, 1),
        }
    )