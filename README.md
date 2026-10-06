# SPHEREx Sky Explorer 🔭🪐

**SPHEREx Sky Explorer** is a public web tool built for the 2026 NASA Space Apps Challenge (*Planet X and SPHEREx*). The application visualizes multi-epoch all-sky infrared images from NASA's SPHEREx mission (0.75 to 5.0 µm) and enables researchers, citizen scientists, and students to detect celestial changes over time through temporal timelines, blink comparators, and side-by-side epoch inspection.

---

## Architecture Overview

Heavy astronomical image processing occurs offline in Python; the web tier serves pre-stretched WebP frames and lightweight JSON metadata.

```text
+---------------------------------------------------------------------------------+
|                                 PREPARATION HALF                                |
|                                                                                 |
|   NASA / IRSA Archive                                                           |
|    (TAP / SIA Cutouts)                                                          |
|             │                                                                   |
|             ▼                                                                   |
|   [science.fetch]     ──> Query metadata first & download small FITS cutouts    |
|             │                                                                   |
|             ▼                                                                   |
|   [science.prep]      ──> Mask bad flags, subtract zodi, reproject common WCS,  |
|             │             apply ZScale + Asinh stretch                          |
|             ▼                                                                   |
|   [data/frames/<id>]  ──> Export ready-to-show WebP frames + index.json         |
+---------------------------------------------------------------------------------+
                                      │
                                      ▼
+---------------------------------------------------------------------------------+
|                                    WEB HALF                                     |
|                                                                                 |
|   [FastAPI Backend]   ──> Serves /health, /targets, /targets/{id}/frames        |
|     (port 8001/8000)      and static /static/frames                             |
|             │                                                                   |
|             ▼                                                                   |
|   [Next.js Frontend]  ──> TargetPicker, ImageViewer, Timeline (scrubber/play),  |
|     (port 3000)           WavelengthBadge, ComparisonViewer (Blink), Explainer  |
+---------------------------------------------------------------------------------+
```

---

## Project Principles

1. **Query metadata first**: Always query observation footprints and timestamps using TAP/ObsCore before requesting pixel data.
2. **Never download the full archive**: SPHEREx produces petabytes of all-sky spectral surveys. We never download full-sky mosaics or unneeded detector cubes.
3. **Use small cutouts**: Only fetch small spatial cutouts centered precisely on the target of interest (e.g. 60–120 arcsec).
4. **Keep data tiers strictly separated**:
   - `data/raw/`: Untouched downloaded FITS cutouts (git-ignored).
   - `data/processed/`: Intermediate arrays (masked, zodi-subtracted, reprojected WCS) (git-ignored).
   - `data/frames/`: Exported 8-bit WebP frames and `index.json` manifests (committed).
5. **Record provenance**: Every frame tracks its original observation ID (`obs_id`), UTC timestamp, spectral wavelength (`wavelength_um`), detector array, and calibration version.
6. **Deterministic methods before ML**: Prioritize classical astronomical image processing (ZScale/Asinh contrast stretching, background subtraction, WCS reprojection, blink comparison, and image difference thresholding) before applying machine learning.

---

## Directory Structure

```text
spherex-explorer/
├── apps/web/                 # Next.js (App Router) + TypeScript + Tailwind + TanStack Query
│   ├── app/                  # layout.tsx, page.tsx
│   ├── components/           # TargetPicker, ImageViewer, Timeline, WavelengthBadge, ComparisonViewer, ExplainerPanel
│   ├── hooks/                # useTargets, useFrames (with frame image preloading)
│   ├── lib/                  # api.ts (typed fetch helpers), types.ts
│   └── public/               # Static assets
├── services/api/             # FastAPI backend service
│   ├── app/main.py           # App entry, CORS, static mount (/static/frames)
│   ├── app/routes/           # health.py, targets.py
│   ├── app/services/         # frames.py (reads data/frames index.json)
│   ├── app/schemas.py        # Pydantic schemas matching index.json
│   └── tests/                # Unit tests for API endpoints
├── science/                  # Reusable Python package (astronomy pipeline)
│   ├── pyproject.toml        # Package definition & dependencies
│   ├── config.py             # SPHEREx constants & labeled FITS extension TODOs
│   ├── fetch/                # query.py (IRSA TAP stub), cutouts.py (stub)
│   ├── prep/                 # mask.py, background.py, reproject.py, stretch.py, export.py
│   ├── detect/               # Moving object detection (stretch track)
│   └── tests/                # Unit tests (test_stretch.py with ZScale + Asinh)
├── scripts/
│   ├── make_mock_data.py     # Generates multi-epoch WebP frames and index.json
│   └── prepare_target.py     # CLI skeleton: --ra --dec --size --name
├── notebooks/                # Jupyter exploration notebooks (.gitkeep)
├── data/
│   ├── raw/                  # Downloaded raw FITS (git-ignored)
│   ├── processed/            # Calibrated/reprojected arrays (git-ignored)
│   └── frames/               # Committed WebP frames & index.json per target
│       └── mock-target/      # 6 multi-epoch mock frames (0.95 - 4.65 µm)
├── Makefile                  # Developer workflow automation
├── pyproject.toml / pytest.ini # Root test configuration
├── .env.example              # Environment variable documentation
└── README.md                 # Project documentation
```

---

## Quickstart

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Setup Environment
```bash
make setup
```
This initializes a Python virtual environment in `.venv`, installs all dependencies, and generates initial mock data.

### 3. Run Tests
```bash
make test
```
Runs both the science package tests (ZScale + Asinh normalization) and the FastAPI endpoint tests (health, targets list, target frames, static files).

### 4. Regenerate Mock Data
```bash
make mock
```
Creates 6 multi-epoch 512x512 WebP frames showing a simulated high-proper-motion trans-Neptunian body / candidate Planet X across SPHEREx spectral channels (0.95 to 4.65 µm).

### 5. Start Applications
- **FastAPI Backend**:
  ```bash
  make api
  ```
  Runs at `http://localhost:8001` (or port specified in `.env`). Interactive docs at `http://localhost:8001/docs`.

- **Web Frontend**:
  ```bash
  make web
  ```
  Runs at `http://localhost:3000`.

---

## `index.json` Manifest Format

Every target in `data/frames/<target_id>/` contains an `index.json` file conforming to:

```json
{
  "target": "mock-target",
  "title": "Mock target",
  "ra": 0.0,
  "dec": 0.0,
  "caption": "Placeholder data for development.",
  "frames": [
    {
      "file": "frame_000.webp",
      "obs_id": "mock-000",
      "time_utc": "2025-01-01T00:00:00Z",
      "wavelength_um": 1.0,
      "detector": 1
    }
  ]
}
```
