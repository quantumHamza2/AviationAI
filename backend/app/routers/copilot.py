"""
AeroMind Copilot Router — AI assistant chat endpoints.
"""
import logging
from typing import Optional, List
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.copilot_service import copilot_service

logger = logging.getLogger("aeromind.copilot")
router = APIRouter(prefix="/api/v1/copilot", tags=["copilot"])

# In-memory session history (per-session in production use Redis)
_chat_history: List[dict] = []


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"


class ChatResponse(BaseModel):
    intent: str
    confidence: float
    response: dict
    session_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process a natural language query and return a structured response."""
    # Parse intent
    intent = copilot_service.parse_intent(request.message)

    # Generate response
    response = copilot_service.generate_response(intent)

    # Store in history
    entry = {
        "role": "user",
        "message": request.message,
        "intent": intent["intent"],
        "response": response,
    }
    _chat_history.append(entry)

    # Trim history
    if len(_chat_history) > 100:
        _chat_history.pop(0)

    logger.info("Copilot: '%s' → %s (%.0f%%)", request.message, intent["intent"], intent["confidence"] * 100)

    return ChatResponse(
        intent=intent["intent"],
        confidence=intent["confidence"],
        response=response,
        session_id=request.session_id or "default",
    )


@router.get("/suggestions")
async def get_suggestions(context: Optional[str] = None):
    """Get context-aware query suggestions."""
    return {"suggestions": copilot_service.get_suggestions(context)}


@router.get("/history")
async def get_history(limit: int = 20):
    """Get recent chat history."""
    return {"history": _chat_history[-limit:]}
