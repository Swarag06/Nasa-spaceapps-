"""FastAPI application entry point for SPHEREx Sky Explorer backend."""

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from services.api.app.routes.health import router as health_router
from services.api.app.routes.targets import router as targets_router
from services.api.app.services.frames import get_data_frames_dir

app = FastAPI(
    title="SPHEREx Sky Explorer API",
    description="Backend API serving SPHEREx all-sky infrared target frames and index metadata.",
    version="0.1.0",
)

# Configure CORS
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(health_router)
app.include_router(targets_router)

# Mount static files for data/frames
frames_path = get_data_frames_dir()
frames_path.mkdir(parents=True, exist_ok=True)

app.mount(
    "/static/frames",
    StaticFiles(directory=str(frames_path)),
    name="frames_static",
)


@app.get("/")
def root():
    return {
        "message": "SPHEREx Sky Explorer API is running",
        "docs": "/docs",
        "health": "/health",
        "targets": "/targets",
    }
