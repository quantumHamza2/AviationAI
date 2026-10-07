"""Fixed, pre-departure features; outcome and batch statistics are never inputs."""
import pandas as pd
from backend.app.services.schedule_features import FEATURE_NAMES, schedule_features

def engineer_features(df):
    required = {"FlightDate", "CRSDepTime", "Origin", "Dest", "UniqueCarrier"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing schedule columns: {sorted(missing)}")
    rows = []
    for _, row in df.iterrows():
        time = int(row["CRSDepTime"])
        if not (0 <= time // 100 <= 23 and 0 <= time % 100 < 60):
            raise ValueError("CRSDepTime must be a valid scheduled HHMM time")
        departure = f"{str(row['FlightDate'])[:10]}T{time // 100:02d}:{time % 100:02d}:00"
        rows.append(schedule_features(row["Origin"], row["Dest"], row["UniqueCarrier"], departure))
    return pd.DataFrame(rows, index=df.index, columns=FEATURE_NAMES)

def create_target(df, threshold_minutes=15.0):
    if "DepDelay" not in df:
        raise ValueError("DepDelay is required to train a departure-delay model")
    delay = pd.to_numeric(df["DepDelay"], errors="raise")
    if delay.isna().any():
        raise ValueError("Missing delay labels must be removed before training")
    return (delay >= threshold_minutes).astype(int)
