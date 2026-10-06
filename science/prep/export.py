"""Export prepared cutout images into WebP format and generate index.json catalog.

Step description:
- Converts stretched 0-1 float arrays into 8-bit grayscale or false-color WebP images.
- Writes metadata to data/frames/<target>/index.json containing target coordinates,
  observation timestamps, wavelengths, detectors, and file references.
"""

from pathlib import Path
from typing import Any, Dict, List
import numpy as np


def export_target_frame(
    stretched_data: np.ndarray,
    output_path: Path,
    quality: int = 90,
) -> Path:
    """Export a stretched 0-1 image array to WebP format.

    Args:
        stretched_data: 2D numpy array with float values in [0.0, 1.0].
        output_path: Destination path for the WebP frame.
        quality: WebP quality setting (0-100).

    Returns:
        Path to the saved WebP file.

    Raises:
        NotImplementedError: Pending full pipeline integration.
    """
    # TODO: Support color mapping (Viridis / Magma / grayscale) and metadata chunk embedding
    raise NotImplementedError("Frame export pipeline will be implemented with real pipeline runner.")


def export_target_index(
    target_id: str,
    title: str,
    ra: float,
    dec: float,
    caption: str,
    frames_metadata: List[Dict[str, Any]],
    output_path: Path,
) -> Path:
    """Export target metadata and frame index to index.json.

    Args:
        target_id: Unique slug identifier for the target.
        title: Human-readable display title.
        ra: Right Ascension in degrees.
        dec: Declination in degrees.
        caption: Scientific caption or description.
        frames_metadata: List of frame metadata dicts matching FrameItem schema.
        output_path: Target directory path where index.json is written.

    Returns:
        Path to the saved index.json file.

    Raises:
        NotImplementedError: Pending full pipeline integration.
    """
    # TODO: Validate with Pydantic TargetFramesIndex model before writing
    raise NotImplementedError("Index export pipeline will be implemented with real pipeline runner.")
