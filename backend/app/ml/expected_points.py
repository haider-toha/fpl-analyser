"""XGBoost model for expected points prediction."""
import numpy as np
from typing import Optional
import joblib
from pathlib import Path

try:
    import xgboost as xgb
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import mean_absolute_error, mean_squared_error
    HAS_ML = True
except ImportError:
    HAS_ML = False


class ExpectedPointsModel:
    """XGBoost model for predicting player expected points."""
    
    FEATURES = [
        "form",
        "points_per_game",
        "minutes",
        "goals_scored",
        "assists",
        "clean_sheets",
        "xg",
        "xa",
        "xgi",
        "price",
        "selected_by_percent",
        "fixture_difficulty",
        "is_home",
        "rest_days",
        "position_gk",
        "position_def",
        "position_mid",
        "position_fwd",
    ]
    
    def __init__(self, model_path: Optional[str] = None):
        """Initialize the model."""
        self.model = None
        self.model_path = Path(model_path) if model_path else Path("models/xgb_expected_pts.joblib")
        
        if self.model_path.exists() and HAS_ML:
            self.load()
    
    def prepare_features(self, player_data: dict, fixture_data: dict = None) -> np.ndarray:
        """Prepare feature vector for a single player."""
        fixture_data = fixture_data or {}
        
        # Position one-hot encoding
        position = player_data.get("position", 0)
        
        features = [
            float(player_data.get("form", 0) or 0),
            float(player_data.get("points_per_game", 0) or 0),
            float(player_data.get("minutes", 0) or 0) / 90,  # Normalize to games
            float(player_data.get("goals_scored", 0) or 0),
            float(player_data.get("assists", 0) or 0),
            float(player_data.get("clean_sheets", 0) or 0),
            float(player_data.get("xg", 0) or 0),
            float(player_data.get("xa", 0) or 0),
            float(player_data.get("xgi", 0) or 0),
            float(player_data.get("price", 0) or 0),
            float(player_data.get("selected_by_percent", 0) or 0),
            float(fixture_data.get("difficulty", 3)),  # Default medium difficulty
            float(fixture_data.get("is_home", 0.5)),
            float(fixture_data.get("rest_days", 7)) / 7,  # Normalize
            1.0 if position == 1 else 0.0,  # GK
            1.0 if position == 2 else 0.0,  # DEF
            1.0 if position == 3 else 0.0,  # MID
            1.0 if position == 4 else 0.0,  # FWD
        ]
        
        return np.array(features).reshape(1, -1)
    
    def train(self, X: np.ndarray, y: np.ndarray, **kwargs) -> dict:
        """Train the XGBoost model."""
        if not HAS_ML:
            raise ImportError("XGBoost and scikit-learn are required for training")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Default hyperparameters
        params = {
            "objective": "reg:squarederror",
            "max_depth": 6,
            "learning_rate": 0.1,
            "n_estimators": 100,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "random_state": 42,
            **kwargs,
        }
        
        # Train model
        self.model = xgb.XGBRegressor(**params)
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False,
        )
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        
        # Cross-validation
        cv_scores = cross_val_score(self.model, X, y, cv=5, scoring="neg_mean_absolute_error")
        
        return {
            "mae": mae,
            "rmse": rmse,
            "cv_mae_mean": -cv_scores.mean(),
            "cv_mae_std": cv_scores.std(),
            "feature_importance": dict(zip(self.FEATURES, self.model.feature_importances_.tolist())),
        }
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict expected points."""
        if self.model is None:
            # Return simple estimate based on form and ppg if no model
            if X.shape[1] >= 2:
                form = X[:, 0]
                ppg = X[:, 1]
                return form * 0.6 + ppg * 0.4
            return np.zeros(X.shape[0])
        
        return self.model.predict(X)
    
    def predict_with_confidence(self, X: np.ndarray, n_iterations: int = 100) -> tuple:
        """Predict with confidence intervals using bootstrap."""
        if self.model is None:
            predictions = self.predict(X)
            return predictions, np.ones_like(predictions) * 0.5, np.ones_like(predictions) * 0.5
        
        predictions = self.predict(X)
        
        # Simple confidence interval (would use proper bootstrap with more data)
        std = np.abs(predictions) * 0.2  # 20% uncertainty
        
        lower = predictions - 1.96 * std
        upper = predictions + 1.96 * std
        
        return predictions, lower, upper
    
    def save(self, path: Optional[str] = None):
        """Save model to disk."""
        if not HAS_ML or self.model is None:
            return
        
        save_path = Path(path) if path else self.model_path
        save_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, save_path)
    
    def load(self, path: Optional[str] = None):
        """Load model from disk."""
        if not HAS_ML:
            return
        
        load_path = Path(path) if path else self.model_path
        if load_path.exists():
            self.model = joblib.load(load_path)
    
    def get_feature_importance(self) -> dict:
        """Get feature importance from trained model."""
        if self.model is None:
            return {}
        
        return dict(zip(self.FEATURES, self.model.feature_importances_.tolist()))

