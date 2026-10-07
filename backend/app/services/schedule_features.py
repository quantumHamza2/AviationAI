"""Schedule-only features shared by training and inference. No outcome-derived inputs."""
from datetime import datetime
# Major airlines for encoding
AIRLINES = [
    "AA", "DL", "UA", "WN", "B6", "AS", "NK", "F9", "HA", "G4",
    "SY", "QX", "OH", "YV", "OO", "MQ", "YX", "9E", "EV", "ZW",
]

# Top 50 busiest airports
AIRPORTS = [
    "KATL", "KLAX", "KORD", "KDFW", "KDEN", "KJFK", "KSFO", "KLAS", "KSEA", "KMCO",
    "KEWR", "KBOS", "KMSP", "KPHL", "KLGA", "KFLL", "KDTW", "KSLC", "KSAN", "KDCA",
    "KBWI", "KTPA", "KPDX", "KSTL", "KHOU", "KBNA", "KAUS", "KOAK", "KMCI", "KRDU",
    "KCLT", "KMDW", "KSMF", "KSJC", "KSAT", "KPIT", "KRSW", "KCVG", "KCMH", "KIND",
    "EGLL", "LFPG", "EDDF", "EHAM", "OMDB", "RJTT", "WSSS", "VHHH", "YSSY", "VIDP",
]

FEATURE_NAMES = ["hour", "day_of_week", "month", "is_weekend", "is_peak_hour", "is_red_eye", "origin_idx", "dest_idx", "is_hub_origin", "is_hub_dest", "airline_idx"]

def schedule_features(origin, destination, airline, departure, day_of_week=None, month=None):
    dt = datetime.fromisoformat(departure.replace("Z", "+00:00"))
    day = dt.weekday() if day_of_week is None else day_of_week
    origin = str(origin).strip().upper()
    destination = str(destination).strip().upper()
    airline = str(airline or "XX").strip().upper()
    oi = AIRPORTS.index(origin) if origin in AIRPORTS else len(AIRPORTS)
    di = AIRPORTS.index(destination) if destination in AIRPORTS else len(AIRPORTS)
    return dict(zip(FEATURE_NAMES, [dt.hour, day, dt.month if month is None else month,
        int(day >= 5), int(6 <= dt.hour <= 9 or 16 <= dt.hour <= 20),
        int(dt.hour <= 5 or dt.hour >= 22), oi, di, int(oi < 10), int(di < 10),
        AIRLINES.index(airline) if airline in AIRLINES else len(AIRLINES)]))
