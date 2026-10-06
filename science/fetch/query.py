"""Query SPHEREx archive metadata via IRSA / PyVO.

Principles:
- Query metadata first via TAP/ObsCore.
- Never download the full all-sky archive; retrieve only target observation headers and footprints.
"""

from typing import Any, Dict, List, Optional
from science.config import IRSA_TAP_URL


def query_spherex_observations(
    ra: float,
    dec: float,
    radius_deg: float = 0.1,
    time_start_iso: Optional[str] = None,
    time_end_iso: Optional[str] = None,
    tap_service_url: str = IRSA_TAP_URL,
) -> List[Dict[str, Any]]:
    """Query IRSA TAP service for SPHEREx observations covering a target sky coordinate.

    Args:
        ra: Right Ascension in decimal degrees (J2000).
        dec: Declination in decimal degrees (J2000).
        radius_deg: Cone search radius in degrees.
        time_start_iso: Optional start observation time (UTC ISO8601).
        time_end_iso: Optional end observation time (UTC ISO8601).
        tap_service_url: IRSA Table Access Protocol (TAP) service URL.

    Returns:
        List of observation metadata dictionaries (obs_id, time_utc, wavelength, detector, etc.).

    Raises:
        NotImplementedError: Pending real SPHEREx archive TAP schema verification.
    """
    # TODO: Verify TAP table name (e.g., spherex_obscore or irsa.spherex_cutouts) with IRSA docs
    # TODO: Execute TAP query using pyvo.dal.TAPService(tap_service_url)
    raise NotImplementedError("SPHEREx TAP query logic will be implemented once IRSA schema is verified.")
