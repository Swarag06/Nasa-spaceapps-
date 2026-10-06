"""Configuration and constants for SPHEREx data handling.

NOTE: Do not assume or hardcode unverified SPHEREx FITS HDU extension names or flag bits.
All constants here must be verified against actual SPHEREx data releases and NASA/IPAC IRSA documentation.
"""

from typing import Final, Dict

# ==============================================================================
# FITS EXTENSION NAMES (HDUs)
# TODO: verify against real SPHEREx FITS files and IRSA documentation
# ==============================================================================
# Primary/science flux image HDU name (candidate names: 'IMAGE', 'SCI', 'PRIMARY')
FITS_EXT_IMAGE: Final[str] = "IMAGE"  # TODO: verify against real files and IRSA docs

# Quality / Bad pixel mask flags HDU name (candidate names: 'FLAGS', 'DQ', 'MASK')
FITS_EXT_FLAGS: Final[str] = "FLAGS"  # TODO: verify against real files and IRSA docs

# Zodiacal light model background HDU name (candidate names: 'ZODI', 'BKG', 'ZODIACAL')
FITS_EXT_ZODI: Final[str] = "ZODI"  # TODO: verify against real files and IRSA docs

# Wavelength / WCS coordinate solution HDU name (candidate names: 'WCS-WAVE', 'WCS', 'SPECTRA')
FITS_EXT_WCS_WAVE: Final[str] = "WCS-WAVE"  # TODO: verify against real files and IRSA docs

# Uncertainty / error array HDU name (candidate names: 'UNCERT', 'ERR', 'SIGMA')
FITS_EXT_UNCERT: Final[str] = "UNCERT"  # TODO: verify against real files and IRSA docs

# ==============================================================================
# QUALITY FLAG BIT DEFINITIONS
# TODO: verify against real files and IRSA docs (SPHEREx Science Data Center pipeline specs)
# ==============================================================================
FLAG_BIT_GOOD: Final[int] = 0
FLAG_BIT_BAD_PIXEL: Final[int] = 1 << 0       # Bit 0: Dead / hot pixel (TODO: verify)
FLAG_BIT_COSMIC_RAY: Final[int] = 1 << 1      # Bit 1: Cosmic ray hit (TODO: verify)
FLAG_BIT_SATURATED: Final[int] = 1 << 2       # Bit 2: Saturated detector pixel (TODO: verify)
FLAG_BIT_GLINT_ARTIFACT: Final[int] = 1 << 3  # Bit 3: Optical ghost/glint (TODO: verify)
FLAG_BIT_EDGE_PADDED: Final[int] = 1 << 4     # Bit 4: FOV boundary pad (TODO: verify)

DEFAULT_UNUSABLE_FLAG_MASK: Final[int] = (
    FLAG_BIT_BAD_PIXEL | FLAG_BIT_COSMIC_RAY | FLAG_BIT_SATURATED
)  # TODO: verify against real files and IRSA docs

# ==============================================================================
# SPHEREx INSTRUMENT & ARCHIVE SPECIFICATIONS
# TODO: verify against real files and IRSA docs
# ==============================================================================
# SPHEREx covers 0.75 to 5.0 microns across 6 detector arrays (D1 - D6)
SPHEREX_SPECTRAL_BANDS: Final[Dict[int, tuple[float, float]]] = {
    1: (0.75, 1.11),  # Band 1: 0.75 - 1.11 um (TODO: verify)
    2: (1.11, 1.64),  # Band 2: 1.11 - 1.64 um (TODO: verify)
    3: (1.64, 2.42),  # Band 3: 1.64 - 2.42 um (TODO: verify)
    4: (2.42, 3.82),  # Band 4: 2.42 - 3.82 um (TODO: verify)
    5: (3.82, 4.42),  # Band 5: 3.82 - 4.42 um (TODO: verify)
    6: (4.42, 5.00),  # Band 6: 4.42 - 5.00 um (TODO: verify)
}

# Pixel scale is ~6.2 arcseconds per pixel
SPHEREX_PIXEL_SCALE_ARCSEC: Final[float] = 6.2  # TODO: verify against real files and IRSA docs

# IRSA TAP & SIA Service Endpoints
# TODO: verify exact SPHEREx TAP service URL once publicly registered in IRSA PyVO
IRSA_TAP_URL: Final[str] = "https://irsa.ipac.caltech.edu/TAP"  # TODO: verify against IRSA docs
