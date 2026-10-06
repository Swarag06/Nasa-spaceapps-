#!/usr/bin/env python3
"""Generate mock SPHEREx multi-epoch frames and index.json for development and testing."""

import json
from pathlib import Path
import numpy as np
from PIL import Image

def generate_mock_data(output_dir: Path | str = "data/frames/mock-target") -> None:
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    np.random.seed(1337)
    width, height = 512, 512
    num_frames = 6

    # Fixed background stars for astronomical visual reference
    num_fixed_stars = 40
    fixed_xs = np.random.uniform(20, width - 20, num_fixed_stars)
    fixed_ys = np.random.uniform(20, height - 20, num_fixed_stars)
    fixed_fluxes = np.random.uniform(0.3, 0.85, num_fixed_stars)

    # Moving candidate dot trajectory (e.g. candidate Planet X / small solar system body)
    start_x, start_y = 140.0, 320.0
    end_x, end_y = 370.0, 190.0
    dx = (end_x - start_x) / (num_frames - 1)
    dy = (end_y - start_y) / (num_frames - 1)

    yy, xx = np.indices((height, width))

    timestamps = [
        "2025-03-01T12:00:00Z",
        "2025-03-15T14:30:00Z",
        "2025-04-02T08:15:00Z",
        "2025-04-20T21:45:00Z",
        "2025-05-10T11:00:00Z",
        "2025-06-01T16:20:00Z",
    ]

    # SPHEREx detectors 1 through 6 cover 0.75 - 5.0 um
    wavelengths = [0.95, 1.35, 1.95, 2.85, 3.95, 4.65]
    detectors = [1, 2, 3, 4, 5, 6]

    frames_meta = []

    for i in range(num_frames):
        # 1. Base space noise
        noise = np.random.normal(loc=0.08, scale=0.02, size=(height, width))

        # 2. Add fixed background stars (2D Gaussian PSFs)
        star_field = np.zeros((height, width), dtype=np.float32)
        for fx, fy, f_flux in zip(fixed_xs, fixed_ys, fixed_fluxes):
            r2 = (xx - fx) ** 2 + (yy - fy) ** 2
            star_field += f_flux * np.exp(-r2 / (2 * 1.8**2)).astype(np.float32)

        # 3. Add moving candidate dot
        curr_x = start_x + i * dx
        curr_y = start_y + i * dy
        r_moving = (xx - curr_x) ** 2 + (yy - curr_y) ** 2
        # Bright high-SNR point source
        candidate_source = 0.95 * np.exp(-r_moving / (2 * 2.2**2)).astype(np.float32)

        # Combine
        combined = noise + star_field + candidate_source
        clipped = np.clip(combined, 0.0, 1.0)
        img_uint8 = (clipped * 255.0).astype(np.uint8)

        # Save as WebP
        filename = f"frame_{i:03d}.webp"
        file_path = output_path / filename
        pil_image = Image.fromarray(img_uint8, mode="L")
        pil_image.save(file_path, "WEBP", quality=95)

        frames_meta.append({
            "file": filename,
            "obs_id": f"mock-{i:03d}",
            "time_utc": timestamps[i],
            "wavelength_um": wavelengths[i],
            "detector": detectors[i]
        })

    # Exact index.json schema
    index_data = {
        "target": "mock-target",
        "title": "Mock target",
        "ra": 0.0,
        "dec": 0.0,
        "caption": "Placeholder data for development.",
        "frames": frames_meta
    }

    with open(output_path / "index.json", "w", encoding="utf-8") as f:
        json.dump(index_data, f, indent=2)

    print(f"Generated {num_frames} mock WebP frames and index.json in {output_path}")

if __name__ == "__main__":
    generate_mock_data()
