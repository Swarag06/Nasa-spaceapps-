"""Pydantic schemas for SPHEREx Sky Explorer API matching index.json."""

from typing import List
from pydantic import BaseModel, Field


class FrameItem(BaseModel):
    """Metadata for a single processed SPHEREx cutout frame."""
    file: str = Field(..., description="Filename of the frame within the target directory (e.g. frame_000.webp)")
    obs_id: str = Field(..., description="Observation identifier")
    time_utc: str = Field(..., description="UTC ISO8601 observation timestamp")
    wavelength_um: float = Field(..., description="Central spectral wavelength in microns")
    detector: int = Field(..., description="SPHEREx detector array index (1 to 6)")


class TargetFramesIndex(BaseModel):
    """Full target metadata and frame sequence schema matching index.json."""
    target: str = Field(..., description="Unique slug identifier of the target")
    title: str = Field(..., description="Human-readable title")
    ra: float = Field(..., description="Right Ascension in decimal degrees (J2000)")
    dec: float = Field(..., description="Declination in decimal degrees (J2000)")
    caption: str = Field(..., description="Informational caption or description")
    frames: List[FrameItem] = Field(default_factory=list, description="Ordered list of frame metadata")


class TargetSummary(BaseModel):
    """Summary item returned by GET /targets list endpoint."""
    id: str = Field(..., description="Target slug identifier (directory name)")
    title: str = Field(..., description="Human-readable target title")
    ra: float = Field(..., description="Right Ascension in decimal degrees")
    dec: float = Field(..., description="Declination in decimal degrees")
    caption: str = Field(..., description="Target description or caption")
    frame_count: int = Field(..., description="Total number of frames available")


class HealthResponse(BaseModel):
    """Health check status response."""
    status: str = Field("ok", description="Service operational status")
