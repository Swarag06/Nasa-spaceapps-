"""Health check route."""

from fastapi import APIRouter
from services.api.app.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Check service health and operational status."""
    return HealthResponse(status="ok")
