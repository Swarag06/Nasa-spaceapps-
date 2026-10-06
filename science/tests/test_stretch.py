"""Unit tests for the astronomical stretch function."""

import numpy as np
import pytest
from science.prep.stretch import stretch_image


def test_stretch_image_output_range():
    """Verify that stretch_image returns float32 values bounded between 0.0 and 1.0."""
    np.random.seed(42)
    # Synthetic astronomical image: Gaussian noise background + a few bright stars
    background = np.random.normal(loc=100.0, scale=10.0, size=(100, 100))
    # Add bright point sources
    background[20, 20] += 500.0
    background[50, 50] += 2500.0
    background[80, 80] += 12000.0

    stretched = stretch_image(background)

    assert isinstance(stretched, np.ndarray)
    assert stretched.shape == (100, 100)
    assert stretched.dtype == np.float32
    assert float(np.min(stretched)) >= 0.0
    assert float(np.max(stretched)) <= 1.0
    # Peak star should have high value close to 1
    assert stretched[80, 80] > 0.8


def test_stretch_image_with_nans_and_infs():
    """Ensure NaNs and infinite values are gracefully handled without crashing."""
    data = np.array([
        [10.0, 20.0, np.nan],
        [np.inf, -np.inf, 30.0],
        [40.0, 50.0, 100.0]
    ], dtype=np.float64)

    stretched = stretch_image(data, fill_value=0.0)

    assert stretched.shape == (3, 3)
    assert np.all(np.isfinite(stretched))
    assert np.all((stretched >= 0.0) & (stretched <= 1.0))
    # NaN and Infs should be replaced by fill_value (0.0)
    assert stretched[0, 2] == 0.0
    assert stretched[1, 0] == 0.0


def test_stretch_image_uniform_array():
    """Handle edge case where image is flat/uniform."""
    flat = np.ones((50, 50), dtype=np.float32) * 42.0
    stretched = stretch_image(flat)

    assert stretched.shape == (50, 50)
    assert np.all((stretched >= 0.0) & (stretched <= 1.0))
