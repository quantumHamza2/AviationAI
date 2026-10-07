"""
AeroMind Prediction Service — ML inference for flight delay prediction.
Loads trained models, engineers features, and returns explainable predictions.
"""
import logging
import numpy as np
from typing import Dict, List
from app.services.schedule_features import FEATURE_NAMES, schedule_features
from pathlib import Path
from app.config import settings
from app.models.schemas import (
    DelayPredictionRequest, DelayPredictionResponse,
    FeatureContribution, CongestionScore,
)

logger = logging.getLogger("aeromind.predictions")

# Try importing ML libraries
try:
    import joblib
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    logger.warning("ML libraries not available. Using mock predictions.")


class PredictionService:
    """Flight delay prediction engine with SHAP explainability."""

    def __init__(self):
        self.model = None
        self.model_version = "v1.0-mock"
        self._load_model()

    def _load_model(self):
        """Load trained ML model from disk."""
        if not ML_AVAILABLE:
            return

        model_dir = Path(settings.model_path)
        if not model_dir.is_absolute():
            model_dir = Path(__file__).resolve().parents[3] / model_dir
        model_path = model_dir / "delay_model_v2.joblib"
        if os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
                if list(self.model.feature_names_in_) != FEATURE_NAMES:
                    raise ValueError("Model feature contract does not match schedule features")
                self.model_version = "v2.0-synthetic"
                logger.info("Loaded delay prediction model from %s", model_path)
            except Exception as e:
                self.model = None
                logger.error("Failed to load model: %s", e)
        else:
            logger.info("No trained model found at %s. Using mock predictions.", model_path)

    def _engineer_features(self, request: DelayPredictionRequest) -> Dict[str, float]:
        """Transform prediction request into model features."""
        return schedule_features(request.origin, request.destination, request.airline,
                                 request.scheduled_departure, request.day_of_week, request.month)

    def predict_delay(self, request: DelayPredictionRequest) -> DelayPredictionResponse:
        """Generate a delay prediction for a flight."""
        features = self._engineer_features(request)

        if self.model is not None:
            return self._model_predict(features, request)
        else:
            return self._mock_predict(features, request)

    def _model_predict(self, features: Dict, request: DelayPredictionRequest) -> DelayPredictionResponse:
        """Run actual model inference."""
        try:
            import pandas as pd
            feature_array = pd.DataFrame([features], columns=FEATURE_NAMES)
            prob = float(self.model.predict_proba(feature_array)[0][1])
            delay_min = None  # A binary classifier does not predict minutes.

            # SHAP explanation
            top_factors = self._compute_shap(feature_array, features)

            risk_level = "critical" if prob > 0.8 else "high" if prob > 0.6 else "medium" if prob > 0.3 else "low"

            return DelayPredictionResponse(
                delay_probability=round(prob, 3),
                expected_delay_minutes=None,
                confidence=None,
                risk_level=risk_level,
                top_factors=top_factors,
                model_version=self.model_version,
                explanation=f"Synthetic-data demonstration: estimated delay probability {prob*100:.1f}%. Not validated on real flights.",
            )
        except Exception as e:
            logger.error("Model prediction failed: %s", e)
            return self._mock_predict(features, request)

    def _mock_predict(self, features: Dict, request: DelayPredictionRequest) -> DelayPredictionResponse:
        """Generate realistic mock prediction when no model is loaded."""
        import hashlib
        # Deterministic but varied based on input
        seed_str = f"{request.origin}{request.destination}{request.scheduled_departure}"
        seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16) % 1000

        # Base probability influenced by features
        base_prob = 0.25
        if features.get("is_peak_hour"):
            base_prob += 0.15
        if features.get("is_hub_origin"):
            base_prob += 0.05
        if features.get("month") in [6, 7, 8, 12]:  # Summer + December
            base_prob += 0.10
        if features.get("is_weekend"):
            base_prob -= 0.05

        # Add seed-based variation
        prob = min(0.95, max(0.05, base_prob + (seed % 30 - 15) / 100))
        delay_min = prob * 35 + (seed % 20)

        risk_level = "critical" if prob > 0.8 else "high" if prob > 0.6 else "medium" if prob > 0.3 else "low"

        factors = [
            FeatureContribution(feature="Time of Day", value=features["hour"],
                contribution=0.15 if features.get("is_peak_hour") else -0.05,
                direction="increases_delay" if features.get("is_peak_hour") else "decreases_delay"),
            FeatureContribution(feature="Airport Congestion", value=features.get("origin_idx", 0),
                contribution=0.12 if features.get("is_hub_origin") else -0.03,
                direction="increases_delay" if features.get("is_hub_origin") else "decreases_delay"),
            FeatureContribution(feature="Season", value=features["month"],
                contribution=0.10 if features["month"] in [6,7,8,12] else -0.05,
                direction="increases_delay" if features["month"] in [6,7,8,12] else "decreases_delay"),
            FeatureContribution(feature="Day of Week", value=features["day_of_week"],
                contribution=-0.04 if features.get("is_weekend") else 0.02,
                direction="decreases_delay" if features.get("is_weekend") else "increases_delay"),
            FeatureContribution(feature="Weather Conditions", value=0,
                contribution=round(prob * 0.3, 3),
                direction="increases_delay"),
        ]

        return DelayPredictionResponse(
            delay_probability=round(prob, 3),
            expected_delay_minutes=round(max(0, delay_min), 1),
            confidence=None,
            risk_level=risk_level,
            top_factors=factors,
            model_version="v1.0-mock",
            explanation=f"Illustrative simulation (no trained model) for {request.origin}→{request.destination}: "
                        f"this flight has a {prob*100:.1f}% probability of delay (~{delay_min:.0f} min).",
        )

    def _compute_shap(self, feature_array, features: Dict) -> List[FeatureContribution]:
        """Compute SHAP values for explainability."""
        try:
            import shap
            explainer = shap.TreeExplainer(self.model)
            shap_values = explainer.shap_values(feature_array)
            if isinstance(shap_values, list):
                shap_values = shap_values[1]  # Class 1 (delayed)

            shap_values = np.asarray(shap_values)
            if shap_values.ndim == 3:
                shap_values = shap_values[:, :, 1]
            feature_names = list(features.keys())
            contributions = []
            for i, name in enumerate(feature_names):
                val = shap_values[0][i] if i < len(shap_values[0]) else 0
                contributions.append(FeatureContribution(
                    feature=name.replace("_", " ").title(),
                    value=float(features[name]),
                    contribution=round(float(val), 4),
                    direction="increases_delay" if val > 0 else "decreases_delay",
                ))
            contributions.sort(key=lambda x: abs(x.contribution), reverse=True)
            return contributions[:5]
        except Exception as e:
            logger.debug("SHAP computation failed: %s", e)
            return []

    def predict_congestion(self, airport_icao: str, active_flights: int = 0) -> CongestionScore:
        """Predict airport congestion level."""
        import hashlib
        seed = int(hashlib.md5(airport_icao.encode()).hexdigest()[:8], 16)
        base_score = 30 + (seed % 40)
        if active_flights > 50:
            base_score += 20
        elif active_flights > 20:
            base_score += 10

        score = min(100, base_score)
        level = "critical" if score > 80 else "congested" if score > 60 else "busy" if score > 40 else "normal"

        return CongestionScore(
            airport_icao=airport_icao, score=round(score, 1), level=level,
            active_arrivals=active_flights // 2, active_departures=active_flights // 2,
            advisory=f"{'High' if score > 60 else 'Normal'} congestion at {airport_icao}.",
        )


prediction_service = PredictionService()
