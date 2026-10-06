"""Zodiacal light model subtraction for SPHEREx infrared frames.

Step description:
- Reads the ZODI background model extension or calculates solar elongation and ecliptic coordinate models.
- Subtracts smooth interplanetary dust emission / zodiacal light to enhance faint point sources and transients.
"""

from typing import Optional
import numpy as np


def subtract_zodiacal_light(
    flux: np.ndarray,
    zodi_model: Optional[np.ndarray] = None,
    estimate_local_background: bool = False,
) -> np.ndarray:
    """Subtract zodiacal light emission from a SPHEREx cutout.

    Args:
        flux: 2D flux array in MJy/sr or detector counts.
        zodi_model: Optional 2D array containing the SPHEREx pipeline zodiacal light model.
        estimate_local_background: If True and zodi_model is absent, estimate via sigma-clipped statistics.

    Returns:
        Background-subtracted 2D flux array.

    Raises:
        NotImplementedError: Pending pipeline calibration data access.
    """
    # TODO: Verify whether ZODI HDU is provided as an image or parametric polynomial
    # TODO: Support astropy/photutils Background2D fallback
    raise NotImplementedError("Zodiacal background subtraction logic will be implemented with real calibration models.")
