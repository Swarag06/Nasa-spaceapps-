"""Download cutouts from IRSA SIAv2 or cutout service for a specific target.

Principles:
- Never download full 2k x 2k or mosaic FITS files when only a target cutout is needed.
- Download cutouts directly into data/raw/<target>/ with provenance headers intact.
"""

from pathlib import Path
from typing import Optional


def fetch_spherex_cutout(
    obs_id: str,
    ra: float,
    dec: float,
    size_arcsec: float,
    output_path: Path,
    auth_token: Optional[str] = None,
) -> Path:
    """Fetch a target cutout FITS file from the SPHEREx / IRSA cutout API.

    Args:
        obs_id: SPHEREx observation identifier.
        ra: Center Right Ascension in degrees.
        dec: Center Declination in degrees.
        size_arcsec: Box cutout width/height in arcseconds.
        output_path: Destination path in data/raw for storing the downloaded FITS cutout.
        auth_token: Optional IRSA / NASA authentication token if private.

    Returns:
        Path to the saved raw FITS file.

    Raises:
        NotImplementedError: Pending IRSA cutout service URL and protocol verification.
    """
    # TODO: Verify IRSA cutout endpoint protocol (SIAv2, SUTTER, or IPAC cutout service)
    # TODO: Stream downloaded FITS to output_path and verify checksum
    raise NotImplementedError("SPHEREx cutout download logic will be implemented with real IRSA cutout API.")
