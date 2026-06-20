"""
AeroMind Predictions Router — AI delay prediction and congestion endpoints.
"""
from fastapi import APIRouter
from app.services.prediction_service import prediction_service
from app.models.schemas import DelayPredictionRequest, DelayPredictionResponse, CongestionScore

router = APIRouter(prefix="/api/v1/predictions", tags=["predictions"])


@router.post("/delay", response_model=DelayPredictionResponse)
async def predict_delay(request: DelayPredictionRequest):
    """Predict flight delay probability with explainable AI factors."""
    return prediction_service.predict_delay(request)


@router.get("/airport/{icao}/congestion", response_model=CongestionScore)
async def get_congestion(icao: str):
    """Get predicted congestion score for an airport."""
    return prediction_service.predict_congestion(icao.upper())


@router.get("/risk-map")
async def get_risk_map():
    """Get global delay risk data for heatmap visualization."""
    airports = [
        "KATL", "KLAX", "KORD", "KDFW", "KDEN", "KJFK", "KSFO", "KLAS", "KSEA", "KMCO",
        "KEWR", "KBOS", "KMSP", "KPHL", "KLGA", "KFLL", "KDTW", "KSLC",
        "EGLL", "LFPG", "EDDF", "EHAM", "OMDB", "RJTT", "WSSS", "VHHH", "YSSY", "VIDP",
    ]
    # Airport coordinates (hardcoded subset for risk map)
    coords = {
        "KATL": (33.64, -84.43), "KLAX": (33.94, -118.41), "KORD": (41.98, -87.90),
        "KDFW": (32.90, -97.04), "KDEN": (39.86, -104.67), "KJFK": (40.64, -73.78),
        "KSFO": (37.62, -122.38), "KLAS": (36.08, -115.15), "KSEA": (47.45, -122.31),
        "KMCO": (28.43, -81.31), "KEWR": (40.69, -74.17), "KBOS": (42.36, -71.01),
        "KMSP": (44.88, -93.22), "KPHL": (39.87, -75.24), "KLGA": (40.77, -73.87),
        "KFLL": (26.07, -80.15), "KDTW": (42.21, -83.35), "KSLC": (40.79, -111.98),
        "EGLL": (51.47, -0.46), "LFPG": (49.01, 2.55), "EDDF": (50.03, 8.57),
        "EHAM": (52.31, 4.76), "OMDB": (25.25, 55.36), "RJTT": (35.55, 139.78),
        "WSSS": (1.36, 103.99), "VHHH": (22.31, 113.91), "YSSY": (-33.95, 151.18),
        "VIDP": (28.57, 77.10),
    }

    risk_points = []
    for icao in airports:
        congestion = prediction_service.predict_congestion(icao)
        lat, lon = coords.get(icao, (0, 0))
        risk_points.append({
            "icao": icao,
            "lat": lat,
            "lon": lon,
            "risk_score": congestion.score / 100,
            "level": congestion.level,
            "advisory": congestion.advisory,
        })

    return risk_points
