"""Quality flag masking for SPHEREx cutout arrays.

Step description:
- Reads the FLAGS HDU from the SPHEREx FITS product.
- Identifies bad, saturated, cosmic ray, and glint-contaminated pixels using bitwise flags.
- Replaces flagged pixels with NaN or interpolated values for downstream reprojection.
"""

from typing import Optional
import numpy as np
from science.config import DEFAULT_UNUSABLE_FLAG_MASK


def mask_bad_pixels(
    data: np.ndarray,
    flags: np.ndarray,
    mask_bitmask: int = DEFAULT_UNUSABLE_FLAG_MASK,
    fill_value: float = np.nan,
) -> np.ndarray:
    """Mask unusable pixels in the flux array using SPHEREx quality flags.

    Args:
        data: 2D numpy array of flux / surface brightness values.
        flags: 2D integer numpy array of quality flag bits.
        mask_bitmask: Bitmask specifying which flags to treat as invalid.
        fill_value: Replacement value for flagged pixels (default: np.nan).

    Returns:
        Masked flux array of the same shape as data.

    Raises:
        NotImplementedError: Pending verification of flag definitions against IRSA docs.
    """
    # TODO: Verify flag bits against real SPHEREx data release docs
    # TODO: Implement optional spatial interpolation (e.g. astropy.convolution.interpolate_replace_nans)
    raise NotImplementedError("Flag masking pipeline will be implemented following IRSA calibration release.")
