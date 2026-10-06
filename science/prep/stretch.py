"""Image stretching transformations for astronomical cutouts.

Implements non-linear stretches (ZScale + Asinh) to compress high dynamic range
astronomical fluxes into 8-bit displayable formats (0-1 float or WebP).
"""

from typing import Optional
import numpy as np
from astropy.visualization import AsinhStretch, ImageNormalize, ZScaleInterval


def stretch_image(
    data: np.ndarray,
    contrast: float = 0.25,
    a: float = 0.1,
    fill_value: float = 0.0,
) -> np.ndarray:
    """Apply ZScaleInterval and AsinhStretch to an astronomical flux array.

    This maps arbitrary dynamic range flux values into normalized [0.0, 1.0] float values,
    suitable for display or converting into WebP/PNG images.

    Args:
        data: 2D numpy array of image flux data.
        contrast: Contrast parameter for ZScaleInterval (default: 0.25).
        a: Scale factor for AsinhStretch (default: 0.1).
        fill_value: Replacement value for non-finite values (NaN, Inf) after stretching.

    Returns:
        2D numpy array of float32 values strictly within [0.0, 1.0].
    """
    if data.size == 0:
        return np.empty_like(data, dtype=np.float32)

    # Work with float array and replace NaNs/Infs for normalization calculation
    arr = np.asarray(data, dtype=np.float64)
    finite_mask = np.isfinite(arr)

    if not np.any(finite_mask):
        return np.full(arr.shape, fill_value, dtype=np.float32)

    finite_values = arr[finite_mask]

    # Handle edge case where all finite pixels are identical
    if np.all(finite_values == finite_values[0]):
        out = np.full(arr.shape, fill_value, dtype=np.float32)
        out[finite_mask] = 0.5
        return out

    # Determine ZScale interval on finite pixels
    interval = ZScaleInterval(contrast=contrast)
    vmin, vmax = interval.get_limits(finite_values)

    # In case interval collapses
    if vmin == vmax or not np.isfinite(vmin) or not np.isfinite(vmax):
        vmin = float(np.min(finite_values))
        vmax = float(np.max(finite_values))
        if vmin == vmax:
            vmax = vmin + 1.0

    # ImageNormalize with AsinhStretch and clip=True
    norm = ImageNormalize(
        vmin=vmin,
        vmax=vmax,
        stretch=AsinhStretch(a=a),
        clip=True,
    )

    normalized = norm(arr)

    # Replace non-finite pixels in original data with fill_value, and clip valid results to [0.0, 1.0]
    result = np.clip(normalized, 0.0, 1.0).astype(np.float32)
    result = np.where(finite_mask, result, np.float32(fill_value))

    return result
