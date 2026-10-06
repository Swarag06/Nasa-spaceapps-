#!/usr/bin/env python3
"""CLI script to prepare a SPHEREx target cutout sequence.

Usage:
    python scripts/prepare_target.py --ra 10.684 --dec 41.268 --size 120.0 --name andromeda-core
"""

import argparse
import sys
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(
        description="Prepare a multi-epoch SPHEREx cutout series for a target."
    )
    parser.add_argument(
        "--ra",
        type=float,
        required=True,
        help="Target Right Ascension in decimal degrees (J2000).",
    )
    parser.add_argument(
        "--dec",
        type=float,
        required=True,
        help="Target Declination in decimal degrees (J2000).",
    )
    parser.add_argument(
        "--size",
        type=float,
        default=60.0,
        help="Cutout box size in arcseconds (default: 60.0).",
    )
    parser.add_argument(
        "--name",
        type=str,
        required=True,
        help="Target identifier name/slug (e.g., mock-target, planet-x-cand-1).",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/frames",
        help="Output root directory for target frame assets.",
    )
    return parser.parse_args()


def prepare_target(ra: float, dec: float, size: float, name: str, output_dir: str = "data/frames"):
    """Orchestrate query, download, preprocessing, stretching, and export for a target."""
    print(f"Preparing SPHEREx target: {name}")
    print(f"Coordinates: RA={ra:.4f}°, Dec={dec:.4f}°, Box Size={size:.1f}\"")

    target_dir = Path(output_dir) / name
    target_dir.mkdir(parents=True, exist_ok=True)

    # 1. Query metadata
    print("Step 1: Querying observation metadata via IRSA TAP...")
    # TODO: observations = query_spherex_observations(ra, dec, radius_deg=size / 3600.0)

    # 2. Download cutouts
    print("Step 2: Downloading cutouts to data/raw/...")
    # TODO: for obs in observations: fetch_spherex_cutout(...)

    # 3. Quality masking & Zodiacal subtraction
    print("Step 3: Masking bad pixels & subtracting zodiacal background...")
    # TODO: mask_bad_pixels(), subtract_zodiacal_light()

    # 4. Common WCS reprojection
    print("Step 4: Reprojecting multi-epoch cutouts onto common WCS...")
    # TODO: reproject_to_target_wcs()

    # 5. Image stretch & WebP export
    print("Step 5: Applying ZScale + Asinh stretch and exporting WebP images...")
    # TODO: stretch_image(), export_target_frame()

    # 6. Generate index.json
    print(f"Step 6: Writing target index to {target_dir / 'index.json'}...")
    # TODO: export_target_index()

    print(f"[Notice] Offline science pipeline is stubbed. Use scripts/make_mock_data.py to generate development assets.")


def main():
    args = parse_args()
    prepare_target(
        ra=args.ra,
        dec=args.dec,
        size=args.size,
        name=args.name,
        output_dir=args.output_dir,
    )


if __name__ == "__main__":
    main()
