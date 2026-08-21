import pandas as pd
import numpy as np
import xgboost as xgb
from datetime import timedelta

class XGBoostForecaster:
    def __init__(self):
        self.model = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            random_state=42
        )
        self.last_known_data = None
        self.std_dev = 0
        
    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df['ds'] = pd.to_datetime(df['ds'])
        
        df['day_of_week'] = df['ds'].dt.dayofweek
        df['month'] = df['ds'].dt.month
        df['day_of_month'] = df['ds'].dt.day
        df['week_of_year'] = df['ds'].dt.isocalendar().week.astype(int)
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        df['quarter'] = df['ds'].dt.quarter
        
        # Features that require historical window
        if 'y' in df.columns:
            df['lag_7'] = df['y'].shift(7)
            df['lag_14'] = df['y'].shift(14)
            df['rolling_mean_7'] = df['y'].rolling(window=7).mean()
            df['rolling_std_7'] = df['y'].rolling(window=7).std()
            
            # Fill NAs
            df = df.bfill()
            df = df.fillna(0)
            
        return df

    def fit(self, df: pd.DataFrame):
        df_featured = self._engineer_features(df)
        
        # Save std dev for prediction bounds
        self.std_dev = df['y'].std() if len(df) > 1 else df['y'].mean() * 0.2
        if pd.isna(self.std_dev) or self.std_dev == 0:
             self.std_dev = 1.0

        # Save last known values for iterative prediction
        self.last_known_data = df_featured.copy()
        
        features = ['day_of_week', 'month', 'day_of_month', 'week_of_year', 'is_weekend', 'quarter', 
                    'lag_7', 'lag_14', 'rolling_mean_7', 'rolling_std_7']
        
        X = df_featured[features]
        y = df_featured['y']
        
        self.model.fit(X, y)
        
    def predict(self, horizon_days: int) -> list:
        result = []
        current_data = self.last_known_data.copy()
        
        # Iterate day by day to use own predictions as lags
        last_date = pd.to_datetime(current_data['ds'].iloc[-1])
        
        for i in range(horizon_days):
            next_date = last_date + timedelta(days=i+1)
            
            # Create dummy row
            new_row = pd.DataFrame({'ds': [next_date], 'y': [np.nan]})
            current_data = pd.concat([current_data, new_row], ignore_index=True)
            
            # Re-engineer features to calculate lags based on previously predicted y
            # but wait, 'y' for future rows is NaN, we need to fill it iteratively
            current_data_featured = self._engineer_features(current_data)
            
            features = ['day_of_week', 'month', 'day_of_month', 'week_of_year', 'is_weekend', 'quarter', 
                        'lag_7', 'lag_14', 'rolling_mean_7', 'rolling_std_7']
                        
            X_pred = current_data_featured[features].iloc[[-1]]
            
            pred_y = float(self.model.predict(X_pred)[0])
            pred_y = max(0.0, pred_y) # Clip to 0
            
            # Update the 'y' for the current row so next iterations can use it as lag
            current_data.iloc[-1, current_data.columns.get_loc('y')] = pred_y
            
            result.append({
                "ds": next_date.strftime("%Y-%m-%d"),
                "yhat": pred_y,
                "yhat_upper": pred_y + self.std_dev,
                "yhat_lower": max(0.0, pred_y - self.std_dev)
            })
            
        return result
