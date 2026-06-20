"""
AeroMind Cache Service — Redis wrapper for caching flight states, weather, and airports.
"""
import json
import logging
from typing import Optional, Any
import redis.asyncio as redis
from app.config import settings

logger = logging.getLogger("aeromind.cache")


class CacheService:
    """Redis-backed caching with TTL management."""

    # Cache key prefixes and TTLs
    KEYS = {
        "flight_states": {"prefix": "aeromind:flights:states", "ttl": 15},
        "flight_stats": {"prefix": "aeromind:flights:stats", "ttl": 15},
        "weather_metar": {"prefix": "aeromind:weather:metar", "ttl": 300},
        "weather_risk": {"prefix": "aeromind:weather:risk", "ttl": 300},
        "weather_overlay": {"prefix": "aeromind:weather:overlay", "ttl": 600},
        "airports": {"prefix": "aeromind:airports:all", "ttl": 3600},
        "airport_detail": {"prefix": "aeromind:airports:detail", "ttl": 600},
        "analytics": {"prefix": "aeromind:analytics:summary", "ttl": 60},
    }

    def __init__(self):
        self._redis: Optional[redis.Redis] = None

    async def connect(self):
        """Initialize Redis connection."""
        try:
            self._redis = redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            await self._redis.ping()
            logger.info("Redis connected at %s", settings.redis_url)
        except Exception as e:
            logger.warning("Redis connection failed: %s. Running without cache.", e)
            self._redis = None

    async def disconnect(self):
        """Close Redis connection."""
        if self._redis:
            await self._redis.close()

    @property
    def is_connected(self) -> bool:
        return self._redis is not None

    async def get(self, key_type: str, key_id: str = "") -> Optional[Any]:
        """Get a cached value by key type and optional ID."""
        if not self._redis:
            return None
        try:
            cfg = self.KEYS.get(key_type)
            if not cfg:
                return None
            key = f"{cfg['prefix']}:{key_id}" if key_id else cfg["prefix"]
            data = await self._redis.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.debug("Cache get error for %s: %s", key_type, e)
            return None

    async def set(self, key_type: str, value: Any, key_id: str = ""):
        """Set a cached value with appropriate TTL."""
        if not self._redis:
            return
        try:
            cfg = self.KEYS.get(key_type)
            if not cfg:
                return
            key = f"{cfg['prefix']}:{key_id}" if key_id else cfg["prefix"]
            await self._redis.setex(key, cfg["ttl"], json.dumps(value, default=str))
        except Exception as e:
            logger.debug("Cache set error for %s: %s", key_type, e)

    async def delete(self, key_type: str, key_id: str = ""):
        """Delete a cached key."""
        if not self._redis:
            return
        try:
            cfg = self.KEYS.get(key_type)
            if not cfg:
                return
            key = f"{cfg['prefix']}:{key_id}" if key_id else cfg["prefix"]
            await self._redis.delete(key)
        except Exception as e:
            logger.debug("Cache delete error for %s: %s", key_type, e)

    async def publish(self, channel: str, message: Any):
        """Publish a message to a Redis pub/sub channel."""
        if not self._redis:
            return
        try:
            await self._redis.publish(channel, json.dumps(message, default=str))
        except Exception as e:
            logger.debug("Publish error: %s", e)


# Singleton
cache_service = CacheService()
