import pandas as pd
from prophet import Prophet
import numpy as np

class ProphetForecaster:
    def __init__(self):
        self.model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode='multiplicative',
            changepoint_prior_scale=0.05
        )
        
        # Add custom Sri Lanka seasonality regressors
        # Sinhala New Year in April
        self.model.add_seasonality(name='sinhala_new_year', period=365.25, fourier_order=3, condition_name='is_sinhala_new_year')
        # Christmas in December
        self.model.add_seasonality(name='christmas', period=365.25, fourier_order=3, condition_name='is_christmas')
        # Vesak in May
        self.model.add_seasonality(name='vesak', period=365.25, fourier_order=3, condition_name='is_vesak')
        # Black Friday in November
        self.model.add_seasonality(name='black_friday', period=365.25, fourier_order=3, condition_name='is_black_friday')
        
    def _add_conditions(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df['ds'] = pd.to_datetime(df['ds'])
        
        df['is_sinhala_new_year'] = df['ds'].dt.month == 4
        df['is_christmas'] = df['ds'].dt.month == 12
        df['is_vesak'] = df['ds'].dt.month == 5
        # Rough approximation for November
        df['is_black_friday'] = df['ds'].dt.month == 11
        
        return df

    def fit(self, df: pd.DataFrame):
        df = self._add_conditions(df)
        self.model.fit(df)
        
    def predict(self, horizon_days: int) -> list:
        future = self.model.make_future_dataframe(periods=horizon_days)
        future = self._add_conditions(future)
        
        forecast = self.model.predict(future)
        
        # Return only the future rows, not historical fitted values
        future_forecast = forecast.tail(horizon_days).copy()
        
        # Clip yhat and yhat_lower to minimum of zero because demand cannot be negative
        future_forecast['yhat'] = future_forecast['yhat'].clip(lower=0)
        future_forecast['yhat_lower'] = future_forecast['yhat_lower'].clip(lower=0)
        future_forecast['yhat_upper'] = future_forecast['yhat_upper'].clip(lower=0)
        
        result = []
        for _, row in future_forecast.iterrows():
            result.append({
                "ds": row['ds'].strftime("%Y-%m-%d"),
                "yhat": float(row['yhat']),
                "yhat_upper": float(row['yhat_upper']),
                "yhat_lower": float(row['yhat_lower'])
            })
            
        return result

    def get_confidence_score(self, history_length: int) -> float:
        """Calculate confidence based on training data length."""
        if history_length < 30:
            return 0.4
        elif history_length <= 90:
            return 0.6
        elif history_length <= 180:
            return 0.75
        else:
            return 0.88
