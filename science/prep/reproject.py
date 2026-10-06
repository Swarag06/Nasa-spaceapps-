"""Reprojection of multi-epoch and multi-band SPHEREx cutouts to a common WCS.

Step description:
- Takes a target observation with its native SPHEREx detector WCS.
- Reprojects the pixel grid onto a common celestial projection (e.g., North-up Gnomonic/TAN projection centered on target RA/Dec).
- Conserves flux while aligning multiple epochs for exact pixel-to-pixel blinking and time-series subtraction.
"""

from typing import Any, Tuple
import numpy as np


def reproject_to_target_wcs(
    input_data: np.ndarray,
    input_wcs: Any,
    target_wcs: Any,
    output_shape: Tuple[int, int],
) -> np.ndarray:
    """Reproject a cutout frame to a shared target reference WCS.

    Args:
        input_data: 2D array of input flux values.
        input_wcs: astropy.wcs.WCS representing the observation's celestial coordinate system.
        target_wcs: astropy.wcs.WCS representing the common reference coordinate system.
        output_shape: (height, width) tuple for the output reprojected array.

    Returns:
        2D numpy array aligned to target_wcs.

    Raises:
        NotImplementedError: Pending exact WCS convention verification from SPHEREx headers.
    """
    # TODO: Use reproject.reproject_interp or reproject.reproject_exact for flux conservation
    raise NotImplementedError("Reprojection pipeline will be implemented with verified FITS WCS headers.")
