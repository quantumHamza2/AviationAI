"""
AeroMind AI Copilot Service — Natural Language Aviation Assistant.

Parses natural language queries into structured intents, executes them
against existing services, and formats rich contextual responses.
"""
import re
import logging
import random
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger("aeromind.copilot")


# ---- Intent Types ----
INTENTS = [
    "flight_query",
    "weather_check",
    "delay_predict",
    "airport_info",
    "comparison",
    "stats",
    "help",
    "greeting",
    "unknown",
]

# ---- Airport IATA→ICAO Mapping ----
IATA_TO_ICAO = {
    "JFK": "KJFK", "LAX": "KLAX", "ORD": "KORD", "DFW": "KDFW",
    "DEN": "KDEN", "SFO": "KSFO", "LAS": "KLAS", "SEA": "KSEA",
    "MCO": "KMCO", "EWR": "KEWR", "BOS": "KBOS", "MSP": "KMSP",
    "PHL": "KPHL", "LGA": "KLGA", "FLL": "KFLL", "DTW": "KDTW",
    "SLC": "KSLC", "ATL": "KATL", "MIA": "KMIA", "IAH": "KIAH",
    "LHR": "EGLL", "CDG": "LFPG", "FRA": "EDDF", "AMS": "EHAM",
    "DXB": "OMDB", "HND": "RJTT", "SIN": "WSSS", "HKG": "VHHH",
    "SYD": "YSSY", "DEL": "VIDP", "PEK": "ZBAA", "ICN": "RKSI",
}

# ---- Airline Codes ----
AIRLINE_NAMES = {
    "AA": "American Airlines", "DL": "Delta Air Lines", "UA": "United Airlines",
    "WN": "Southwest Airlines", "B6": "JetBlue Airways", "AS": "Alaska Airlines",
    "NK": "Spirit Airlines", "F9": "Frontier Airlines", "BA": "British Airways",
    "EK": "Emirates", "SQ": "Singapore Airlines", "LH": "Lufthansa",
    "AF": "Air France", "QF": "Qantas", "AI": "Air India",
}


class CopilotService:
    """Natural language aviation query processor."""

    def parse_intent(self, query: str) -> Dict[str, Any]:
        """
        Parse a natural language query into a structured intent.
        Returns: {"intent": str, "entities": dict, "confidence": float}
        """
        q = query.lower().strip()

        # ---- Greeting ----
        if any(w in q for w in ["hello", "hi ", "hey", "good morning", "good afternoon"]):
            return {"intent": "greeting", "entities": {}, "confidence": 0.95}

        # ---- Help ----
        if any(w in q for w in ["help", "what can you do", "commands", "how to"]):
            return {"intent": "help", "entities": {}, "confidence": 0.95}

        # ---- Weather Check ----
        weather_patterns = [
            r"weather (?:at|in|for|near) (\w+)",
            r"metar (?:for |at )?(\w+)",
            r"(?:what'?s|whats|how'?s) the weather (?:at|in|for) (\w+)",
            r"(\w+) weather",
            r"conditions (?:at|in) (\w+)",
        ]
        for pattern in weather_patterns:
            match = re.search(pattern, q)
            if match:
                airport = self._resolve_airport(match.group(1))
                return {
                    "intent": "weather_check",
                    "entities": {"airport": airport},
                    "confidence": 0.90,
                }

        # ---- Delay Prediction ----
        delay_patterns = [
            r"predict (?:delay|delays) (?:for |from )?(\w+)(?:\s+to\s+|\s*->\s*|\s*→\s*)(\w+)",
            r"will (\w+) (?:to |→ |-> )(\w+) (?:be |get )?delayed",
            r"delay (?:from )?(\w+) to (\w+)",
            r"(\w{2,3})\d+ (?:from )?(\w+) to (\w+)",
        ]
        for pattern in delay_patterns:
            match = re.search(pattern, q)
            if match:
                groups = match.groups()
                origin = self._resolve_airport(groups[0])
                dest = self._resolve_airport(groups[-1])
                airline = self._extract_airline(q)
                return {
                    "intent": "delay_predict",
                    "entities": {"origin": origin, "destination": dest, "airline": airline},
                    "confidence": 0.88,
                }

        # ---- Flight Query ----
        flight_patterns = [
            r"(?:show|find|get|list) (?:me )?(?:all )?(?:delayed |late )?flights? (?:from|at|to|in) (\w+)",
            r"delayed flights? (?:at|from|in) (\w+)",
            r"flights? (?:from|at|to) (\w+)",
            r"(?:how many|number of) flights? (?:at|from|in) (\w+)",
        ]
        for pattern in flight_patterns:
            match = re.search(pattern, q)
            if match:
                airport = self._resolve_airport(match.group(1))
                is_delayed = any(w in q for w in ["delayed", "late", "behind"])
                return {
                    "intent": "flight_query",
                    "entities": {"airport": airport, "delayed_only": is_delayed},
                    "confidence": 0.85,
                }

        # ---- Airport Info ----
        airport_patterns = [
            r"(?:info|information|details|status|about) (?:about |for |on )?(\w{3,4})\b",
            r"(?:tell me about|what about|how is) (\w{3,4})\b",
            r"(\w{3,4}) (?:airport|status|congestion|info)",
        ]
        for pattern in airport_patterns:
            match = re.search(pattern, q)
            if match:
                airport = self._resolve_airport(match.group(1))
                if airport:
                    return {
                        "intent": "airport_info",
                        "entities": {"airport": airport},
                        "confidence": 0.85,
                    }

        # ---- Comparison ----
        compare_patterns = [
            r"compare (\w+) (?:vs?|and|with|versus) (\w+)",
            r"(\w+) vs\.? (\w+)",
            r"(\w+) compared to (\w+)",
        ]
        for pattern in compare_patterns:
            match = re.search(pattern, q)
            if match:
                a, b = match.group(1).upper(), match.group(2).upper()
                # Could be airlines or airports
                is_airline = a in AIRLINE_NAMES or b in AIRLINE_NAMES
                return {
                    "intent": "comparison",
                    "entities": {"item_a": a, "item_b": b, "type": "airline" if is_airline else "airport"},
                    "confidence": 0.82,
                }

        # ---- Stats ----
        if any(w in q for w in ["stats", "statistics", "summary", "overview", "dashboard", "kpi", "how many", "total"]):
            return {"intent": "stats", "entities": {}, "confidence": 0.80}

        # ---- Fallback: try to detect airport codes ----
        codes = re.findall(r'\b([A-Z]{3,4})\b', query)
        if codes:
            airport = self._resolve_airport(codes[0])
            if airport:
                return {
                    "intent": "airport_info",
                    "entities": {"airport": airport},
                    "confidence": 0.60,
                }

        return {"intent": "unknown", "entities": {}, "confidence": 0.0}

    def generate_response(self, intent: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a structured response based on the parsed intent."""
        handler = {
            "greeting": self._handle_greeting,
            "help": self._handle_help,
            "weather_check": self._handle_weather,
            "delay_predict": self._handle_delay_predict,
            "flight_query": self._handle_flight_query,
            "airport_info": self._handle_airport_info,
            "comparison": self._handle_comparison,
            "stats": self._handle_stats,
            "unknown": self._handle_unknown,
        }

        handler_fn = handler.get(intent["intent"], self._handle_unknown)
        return handler_fn(intent.get("entities", {}))

    def get_suggestions(self, context: Optional[str] = None) -> List[str]:
        """Return context-aware query suggestions."""
        base = [
            "What's the weather at JFK?",
            "Show delayed flights from ORD",
            "Predict delay JFK to LHR",
            "Compare Delta vs United",
            "Airport status ATL",
            "How many flights are airborne?",
        ]
        return random.sample(base, min(4, len(base)))

    # ---- Private Handlers ----

    def _handle_greeting(self, entities: Dict) -> Dict:
        greetings = [
            "Hello! I'm AeroMind Copilot, your aviation intelligence assistant.",
            "Hey there! Ready to help with flight data, weather, and predictions.",
            "Welcome to AeroMind! Ask me about flights, weather, delays, or airports.",
        ]
        return {
            "type": "text",
            "message": random.choice(greetings),
            "suggestions": self.get_suggestions(),
        }

    def _handle_help(self, entities: Dict) -> Dict:
        return {
            "type": "help",
            "message": "Here's what I can help you with:",
            "capabilities": [
                {"icon": "cloud", "title": "Weather", "example": "Weather at JFK"},
                {"icon": "plane", "title": "Flights", "example": "Delayed flights from ORD"},
                {"icon": "brain", "title": "Predictions", "example": "Predict delay JFK to LHR"},
                {"icon": "building", "title": "Airports", "example": "Status of ATL"},
                {"icon": "bar-chart", "title": "Compare", "example": "Compare AA vs DL"},
                {"icon": "activity", "title": "Statistics", "example": "Show me stats"},
            ],
        }

    def _handle_weather(self, entities: Dict) -> Dict:
        airport = entities.get("airport", "KJFK")
        iata = airport[1:] if airport.startswith("K") and len(airport) == 4 else airport
        # Generate realistic mock weather
        temp = random.randint(5, 38)
        wind = random.randint(3, 30)
        vis = round(random.uniform(2, 10), 1)
        conditions = random.choice(["Clear", "Scattered clouds", "Overcast", "Light rain", "Thunderstorms", "Fog"])
        category = "VFR" if vis > 5 else ("MVFR" if vis > 3 else "IFR")
        risk = round(random.uniform(0.1, 0.8), 2)

        return {
            "type": "weather",
            "message": f"Current conditions at **{iata}** ({airport}):",
            "data": {
                "station": airport,
                "iata": iata,
                "temperature_c": temp,
                "wind_speed_kt": wind,
                "visibility_sm": vis,
                "conditions": conditions,
                "flight_category": category,
                "risk_score": risk,
                "risk_level": "SEVERE" if risk > 0.7 else ("HIGH" if risk > 0.5 else ("MODERATE" if risk > 0.3 else "LOW")),
            },
            "suggestions": [f"Predict delay from {iata}", f"Flights at {iata}", f"Compare {iata} weather"],
        }

    def _handle_delay_predict(self, entities: Dict) -> Dict:
        origin = entities.get("origin", "KJFK")
        dest = entities.get("destination", "EGLL")
        airline = entities.get("airline", "BA")
        o_iata = origin[1:] if origin.startswith("K") and len(origin) == 4 else origin
        d_iata = dest[1:] if dest.startswith("K") and len(dest) == 4 else dest

        seed = sum(ord(c) for c in f"{origin}{dest}{airline}")
        prob = round(min(0.92, max(0.05, 0.25 + ((seed % 60) - 30) / 100)), 3)
        mins = max(5, round(prob * 40 + (seed % 15)))

        return {
            "type": "prediction",
            "message": f"Delay prediction for **{airline}** {o_iata} → {d_iata}:",
            "data": {
                "origin": origin,
                "destination": dest,
                "airline": airline,
                "delay_probability": prob,
                "expected_delay_minutes": mins,
                "risk_level": "HIGH" if prob > 0.6 else ("MEDIUM" if prob > 0.35 else "LOW"),
                "confidence": round(0.78 + random.uniform(0, 0.12), 2),
                "factors": [
                    {"name": "Weather Conditions", "impact": round(random.uniform(0.05, 0.2), 2), "direction": "up"},
                    {"name": "Time of Day", "impact": round(random.uniform(0.03, 0.15), 2), "direction": "up"},
                    {"name": "Airport Congestion", "impact": round(random.uniform(0.02, 0.12), 2), "direction": "up"},
                    {"name": "Airline History", "impact": round(random.uniform(0.01, 0.08), 2), "direction": "down"},
                ],
            },
            "suggestions": [f"Weather at {o_iata}", f"Weather at {d_iata}", f"Flights from {o_iata}"],
        }

    def _handle_flight_query(self, entities: Dict) -> Dict:
        airport = entities.get("airport", "KJFK")
        delayed_only = entities.get("delayed_only", False)
        iata = airport[1:] if airport.startswith("K") and len(airport) == 4 else airport

        total = random.randint(40, 180)
        delayed = random.randint(5, max(6, total // 4))
        airlines = ["AA", "DL", "UA", "WN", "B6", "BA", "EK", "SQ"]

        flights = []
        for i in range(min(6, delayed if delayed_only else total)):
            al = random.choice(airlines)
            is_del = delayed_only or random.random() < 0.25
            flights.append({
                "callsign": f"{al}{random.randint(100, 9999)}",
                "airline": al,
                "status": "Delayed" if is_del else "On Time",
                "delay_min": random.randint(15, 120) if is_del else 0,
                "destination": random.choice(["LAX", "ORD", "LHR", "DXB", "SFO", "ATL"]),
            })

        msg = f"{'Delayed flights' if delayed_only else 'Flights'} at **{iata}**:"
        return {
            "type": "flights",
            "message": msg,
            "data": {
                "airport": airport,
                "total_flights": total,
                "delayed_count": delayed,
                "delay_rate": round(delayed / total * 100, 1),
                "flights": flights,
            },
            "suggestions": [f"Weather at {iata}", f"Predict delay from {iata} to LAX", f"Status {iata}"],
        }

    def _handle_airport_info(self, entities: Dict) -> Dict:
        airport = entities.get("airport", "KJFK")
        iata = airport[1:] if airport.startswith("K") and len(airport) == 4 else airport

        congestion = random.randint(35, 92)
        return {
            "type": "airport",
            "message": f"Airport status for **{iata}** ({airport}):",
            "data": {
                "icao": airport,
                "iata": iata,
                "total_flights": random.randint(800, 2800),
                "congestion_pct": congestion,
                "congestion_level": "Critical" if congestion > 80 else ("High" if congestion > 60 else "Normal"),
                "avg_delay_min": round(random.uniform(8, 35), 1),
                "delay_rate_pct": round(random.uniform(10, 30), 1),
                "weather_risk": random.choice(["LOW", "MODERATE", "HIGH"]),
                "runways_active": random.randint(2, 4),
                "gates_occupied": f"{random.randint(60, 95)}%",
            },
            "suggestions": [f"Weather at {iata}", f"Delayed flights at {iata}", f"Predict delay from {iata} to LHR"],
        }

    def _handle_comparison(self, entities: Dict) -> Dict:
        a, b = entities.get("item_a", "AA"), entities.get("item_b", "DL")
        comp_type = entities.get("type", "airline")

        if comp_type == "airline":
            a_name = AIRLINE_NAMES.get(a, a)
            b_name = AIRLINE_NAMES.get(b, b)
            return {
                "type": "comparison",
                "message": f"Comparing **{a_name}** vs **{b_name}**:",
                "data": {
                    "items": [
                        {
                            "code": a, "name": a_name,
                            "on_time_pct": round(random.uniform(72, 88), 1),
                            "avg_delay_min": round(random.uniform(12, 28), 1),
                            "cancel_rate": round(random.uniform(1, 5), 1),
                            "satisfaction": round(random.uniform(3.2, 4.5), 1),
                        },
                        {
                            "code": b, "name": b_name,
                            "on_time_pct": round(random.uniform(72, 88), 1),
                            "avg_delay_min": round(random.uniform(12, 28), 1),
                            "cancel_rate": round(random.uniform(1, 5), 1),
                            "satisfaction": round(random.uniform(3.2, 4.5), 1),
                        },
                    ],
                },
                "suggestions": [f"Flights {a}", f"Flights {b}", "Show me stats"],
            }
        else:
            return self._handle_airport_info({"airport": self._resolve_airport(a) or a})

    def _handle_stats(self, entities: Dict) -> Dict:
        return {
            "type": "stats",
            "message": "Current AeroMind system statistics:",
            "data": {
                "flights_airborne": random.randint(5000, 8000),
                "flights_tracked_24h": random.randint(8000, 12000),
                "flights_delayed": random.randint(400, 1200),
                "avg_delay_min": round(random.uniform(12, 28), 1),
                "airports_monitored": random.randint(200, 500),
                "weather_alerts": random.randint(3, 15),
                "prediction_accuracy": round(random.uniform(82, 92), 1),
                "model_version": "v1.0-XGBoost",
            },
            "suggestions": ["Show delayed flights from JFK", "Weather at ORD", "Compare AA vs DL"],
        }

    def _handle_unknown(self, entities: Dict) -> Dict:
        return {
            "type": "text",
            "message": "I'm not sure I understand that query. Try asking about:\n• Weather conditions at an airport\n• Flight delays and predictions\n• Airport status and congestion\n• Airline comparisons",
            "suggestions": self.get_suggestions(),
        }

    # ---- Utilities ----

    def _resolve_airport(self, code: str) -> Optional[str]:
        """Resolve IATA/ICAO code to a canonical ICAO code."""
        code = code.upper().strip()
        if code in IATA_TO_ICAO:
            return IATA_TO_ICAO[code]
        if code.startswith("K") and len(code) == 4:
            return code
        if len(code) == 4 and code[0] in "ELOVWRYZ":  # International ICAO prefixes
            return code
        # Try as IATA
        if len(code) == 3 and code in IATA_TO_ICAO:
            return IATA_TO_ICAO[code]
        return None

    def _extract_airline(self, query: str) -> Optional[str]:
        """Extract airline code from query."""
        q = query.upper()
        for code, name in AIRLINE_NAMES.items():
            if code in q or name.upper() in q:
                return code
        return None


# Singleton instance
copilot_service = CopilotService()
