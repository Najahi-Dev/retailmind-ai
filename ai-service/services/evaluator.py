import numpy as np
from typing import List

class ModelEvaluator:
    @staticmethod
    def calculate_mape(actuals: List[float], predicted: List[float]) -> tuple[float, float]:
        """
        Calculate Mean Absolute Percentage Error (MAPE).
        Filters out pairs where actual is 0 to avoid division by zero.
        Returns tuple of (mape, accuracy_percent)
        """
        valid_actuals = []
        valid_predicted = []
        
        for a, p in zip(actuals, predicted):
            if a > 0:
                valid_actuals.append(a)
                valid_predicted.append(p)
                
        if not valid_actuals:
            return 0.0, 100.0
            
        valid_actuals_np = np.array(valid_actuals)
        valid_predicted_np = np.array(valid_predicted)
        
        mape = np.mean(np.abs((valid_actuals_np - valid_predicted_np) / valid_actuals_np)) * 100
        accuracy_percent = max(0.0, 100.0 - mape)
        
        return float(mape), float(accuracy_percent)

    @staticmethod
    def select_best_model(history_length: int) -> str:
        """
        Select best model based on history length.
        """
        if history_length > 90:
            return "prophet"
        else:
            return "xgboost"
