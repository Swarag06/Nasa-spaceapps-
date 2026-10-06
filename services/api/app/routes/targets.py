"""Target catalog and frame series API routes."""

from typing import List
from fastapi import APIRouter, HTTPException, status

from services.api.app.schemas import TargetFramesIndex, TargetSummary
from services.api.app.services.frames import get_target_frames, list_targets

router = APIRouter(prefix="/targets", tags=["targets"])

# ==============================================================================
# TODO LIST: FUTURE ENDPOINTS (STRETCH TRACK / NEXT ITERATION)
# - POST /jobs/prepare-target: Submit asynchronous background task to fetch & prep new RA/Dec cutouts.
# - GET  /jobs/{job_id}: Poll status and progress of cutout preparation pipeline.
# - GET  /search/cone: Live TAP cone search against IRSA archive for observations.
# - GET  /detect/candidates: Run moving-object detection heuristics over a target sequence.
# - POST /user/annotations: Save user-flagged candidate transients or blink discoveries.
# ==============================================================================


@router.get("", response_model=List[TargetSummary])
def get_all_targets() -> List[TargetSummary]:
    """List all available targets in data/frames containing valid index.json catalogs."""
    return list_targets()


@router.get("/{target_id}/frames", response_model=TargetFramesIndex)
def get_frames_for_target(target_id: str) -> TargetFramesIndex:
    """Retrieve full index metadata and frame sequence for a given target identifier."""
    target_data = get_target_frames(target_id)
    if not target_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target '{target_id}' not found or missing valid index.json",
        )
    return target_data
