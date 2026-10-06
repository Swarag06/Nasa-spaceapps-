"""Service for reading and parsing target frame datasets from data/frames."""

import json
import os
from pathlib import Path
from typing import List, Optional

from services.api.app.schemas import TargetFramesIndex, TargetSummary


def get_data_frames_dir() -> Path:
    """Resolve data/frames directory path from environment or project root."""
    env_dir = os.getenv("DATA_FRAMES_DIR", "data/frames")
    path = Path(env_dir)
    if not path.is_absolute():
        # Resolve relative to project root (where services/ or data/ is located)
        root = Path(__file__).resolve().parents[4]
        candidate = root / env_dir
        if candidate.exists():
            return candidate
    return path


def list_targets() -> List[TargetSummary]:
    """Scan data/frames for directories containing a valid index.json."""
    frames_dir = get_data_frames_dir()
    targets: List[TargetSummary] = []

    if not frames_dir.exists() or not frames_dir.is_dir():
        return targets

    for entry in sorted(frames_dir.iterdir()):
        if entry.is_dir():
            index_file = entry / "index.json"
            if index_file.exists() and index_file.is_file():
                try:
                    with open(index_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    validated = TargetFramesIndex.model_validate(data)
                    targets.append(
                        TargetSummary(
                            id=validated.target or entry.name,
                            title=validated.title,
                            ra=validated.ra,
                            dec=validated.dec,
                            caption=validated.caption,
                            frame_count=len(validated.frames),
                        )
                    )
                except Exception as e:
                    # Log or skip malformed target folder
                    continue

    return targets


def get_target_frames(target_id: str) -> Optional[TargetFramesIndex]:
    """Load and validate index.json for a given target ID."""
    frames_dir = get_data_frames_dir()
    target_dir = frames_dir / target_id
    index_file = target_dir / "index.json"

    if not index_file.exists() or not index_file.is_file():
        return None

    try:
        with open(index_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return TargetFramesIndex.model_validate(data)
    except Exception:
        return None
