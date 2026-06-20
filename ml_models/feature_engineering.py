"""
AeroMind Feature Engineering — Shared feature transformation for training and inference.
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime


# Major US airlines
AIRLINES = [
    "AA", "DL", "UA", "WN", "B6", "AS", "NK", "F9", "HA", "G4",
    "SY", "QX", "OH", "YV", "OO", "MQ", "YX", "9E", "EV", "ZW",
]

# US holidays (simplified — month-day pairs)
US_HOLIDAYS = [
    (1, 1), (1, 20), (2, 17), (5, 26), (7, 4), (9, 1),
    (10, 13), (11, 11), (11, 27), (12, 25),
]


def is_holiday(month: int, day: int) -> bool:
    """Check if a date is near a US holiday."""
    for hm, hd in US_HOLIDAYS:
        if month == hm and abs(day - hd) <= 2:
            return True
    return False


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transform raw flight data into ML features.

    Expected columns: FlightDate, DepTime, Origin, Dest, UniqueCarrier,
                      DepDelay, ArrDelay, WeatherDelay, Distance, etc.
    """
    features = pd.DataFrame()

    # Time features
    if "FlightDate" in df.columns:
        dates = pd.to_datetime(df["FlightDate"], errors="coerce")
        features["month"] = dates.dt.month
        features["day_of_week"] = dates.dt.dayofweek
        features["day_of_month"] = dates.dt.day
        features["is_weekend"] = (dates.dt.dayofweek >= 5).astype(int)
        features["is_holiday"] = dates.apply(
            lambda d: int(is_holiday(d.month, d.day)) if pd.notna(d) else 0
        ).values
        features["quarter"] = dates.dt.quarter

    if "DepTime" in df.columns:
        dep = pd.to_numeric(df["DepTime"], errors="coerce").fillna(1200)
        features["hour"] = (dep // 100).clip(0, 23).astype(int)
        features["is_peak_hour"] = features["hour"].apply(
            lambda h: 1 if 6 <= h <= 9 or 16 <= h <= 20 else 0
        )
        features["is_red_eye"] = features["hour"].apply(
            lambda h: 1 if h <= 5 or h >= 22 else 0
        )
    elif "CRSDepTime" in df.columns:
        dep = pd.to_numeric(df["CRSDepTime"], errors="coerce").fillna(1200)
        features["hour"] = (dep // 100).clip(0, 23).astype(int)
        features["is_peak_hour"] = features["hour"].apply(
            lambda h: 1 if 6 <= h <= 9 or 16 <= h <= 20 else 0
        )
        features["is_red_eye"] = features["hour"].apply(
            lambda h: 1 if h <= 5 or h >= 22 else 0
        )

    # Airport features
    if "Origin" in df.columns:
        # Frequency encoding: busier airports get higher values
        origin_freq = df["Origin"].value_counts()
        features["origin_freq"] = df["Origin"].map(origin_freq).fillna(0)
        features["origin_freq_log"] = np.log1p(features["origin_freq"])

    if "Dest" in df.columns:
        dest_freq = df["Dest"].value_counts()
        features["dest_freq"] = df["Dest"].map(dest_freq).fillna(0)
        features["dest_freq_log"] = np.log1p(features["dest_freq"])

    # Airline features
    if "UniqueCarrier" in df.columns or "Reporting_Airline" in df.columns:
        carrier_col = "UniqueCarrier" if "UniqueCarrier" in df.columns else "Reporting_Airline"
        carrier_delay_rate = df.groupby(carrier_col)["is_delayed"].mean() if "is_delayed" in df.columns else None
        features["airline_idx"] = df[carrier_col].apply(
            lambda x: AIRLINES.index(x) if x in AIRLINES else len(AIRLINES)
        )
        if carrier_delay_rate is not None:
            features["airline_delay_rate"] = df[carrier_col].map(carrier_delay_rate).fillna(0.25)

    # Distance
    if "Distance" in df.columns:
        features["distance"] = pd.to_numeric(df["Distance"], errors="coerce").fillna(0)
        features["distance_log"] = np.log1p(features["distance"])
        features["is_short_haul"] = (features["distance"] < 500).astype(int)
        features["is_long_haul"] = (features["distance"] > 2000).astype(int)

    # Weather delay indicators (if available in training data)
    for col in ["WeatherDelay", "CarrierDelay", "NASDelay", "SecurityDelay", "LateAircraftDelay"]:
        if col in df.columns:
            features[f"has_{col.lower()}"] = (pd.to_numeric(df[col], errors="coerce").fillna(0) > 0).astype(int)

    return features


def create_target(df: pd.DataFrame, threshold_minutes: float = 15.0) -> pd.Series:
    """Create binary delay target variable."""
    if "DepDelay" in df.columns:
        delay = pd.to_numeric(df["DepDelay"], errors="coerce").fillna(0)
    elif "ArrDelay" in df.columns:
        delay = pd.to_numeric(df["ArrDelay"], errors="coerce").fillna(0)
    else:
        return pd.Series(np.zeros(len(df)))

    return (delay >= threshold_minutes).astype(int)
