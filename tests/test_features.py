import unittest
import pandas as pd
from ml_models.feature_engineering import engineer_features
from backend.app.services.schedule_features import schedule_features, FEATURE_NAMES

class FeatureContractTests(unittest.TestCase):
    def test_training_matches_serving_and_ignores_outcomes(self):
        row = dict(FlightDate="2026-10-07", CRSDepTime=1730, Origin="KJFK", Dest="KLAX", UniqueCarrier="AA", DepDelay=150, WeatherDelay=100, is_delayed=1)
        a = engineer_features(pd.DataFrame([row]))
        self.assertEqual(list(a.columns), FEATURE_NAMES)
        self.assertEqual(a.iloc[0].to_dict(), schedule_features("KJFK", "KLAX", "AA", "2026-10-07T17:30:00"))
        row.update(DepDelay=0, WeatherDelay=0, is_delayed=0)
        pd.testing.assert_frame_equal(a, engineer_features(pd.DataFrame([row])))
    def test_batch_size_does_not_change_features(self):
        row = dict(FlightDate="2026-10-07", CRSDepTime=1730, Origin="UNKNOWN", Dest="KLAX", UniqueCarrier="XX")
        self.assertEqual(engineer_features(pd.DataFrame([row])).iloc[0].tolist(), engineer_features(pd.DataFrame([row]*5)).iloc[0].tolist())
    def test_invalid_date_fails_instead_of_using_current_time(self):
        with self.assertRaises(ValueError):
            schedule_features("KJFK", "KLAX", "AA", "invalid")


class ServiceContractTests(unittest.TestCase):
    def test_probability_is_not_a_duration_or_confidence(self):
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
        from app.models.schemas import DelayPredictionRequest
        from app.services.prediction_service import PredictionService
        from sklearn.ensemble import RandomForestClassifier
        rows = [schedule_features("KJFK", "KLAX", "AA", f"2026-10-07T{h:02d}:00:00") for h in range(24)]
        model = RandomForestClassifier(n_estimators=5, random_state=42).fit(pd.DataFrame(rows), [int(h > 12) for h in range(24)])
        service = PredictionService.__new__(PredictionService)
        service.model = model
        service.model_version = "test-synthetic"
        service._compute_shap = lambda *args: []
        result = service.predict_delay(DelayPredictionRequest(origin="KJFK", destination="KLAX", airline="AA", scheduled_departure="2026-10-07T17:00:00"))
        self.assertEqual(result.model_version, "test-synthetic")
        self.assertIsNone(result.expected_delay_minutes)
        self.assertIsNone(result.confidence)
        self.assertIn("Synthetic", result.explanation)
    def test_request_rejects_invalid_schedule(self):
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
        from app.models.schemas import DelayPredictionRequest
        from pydantic import ValidationError
        for value in ("invalid", "2026-10-07"):
            with self.assertRaises(ValidationError):
                DelayPredictionRequest(origin="KJFK", destination="KLAX", scheduled_departure=value)

if __name__ == "__main__": unittest.main()
