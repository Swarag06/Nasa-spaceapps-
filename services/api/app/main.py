"""FastAPI application entry point for SPHEREx Sky Explorer backend."""

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from starlette.types import ASGIApp, Receive, Scope, Send

from .routes.health import router as health_router
from .routes.targets import router as targets_router
from .services.frames import get_data_frames_dir

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


class ApiPrefixMiddleware:
    """Normalize requests forwarded under /api/(.*) to root FastAPI routes."""

    def __init__(self, asgi_app: ASGIApp, prefix: str = "/api") -> None:
        self.asgi_app = asgi_app
        self.prefix = prefix

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] in ("http", "websocket"):
            path = scope.get("path", "")
            if path == self.prefix or path.startswith(f"{self.prefix}/"):
                updated_scope = dict(scope)
                stripped = path[len(self.prefix):] or "/"
                updated_scope["path"] = stripped
                updated_scope["root_path"] = self.prefix
                await self.asgi_app(updated_scope, receive, send)
                return
        await self.asgi_app(scope, receive, send)


app.add_middleware(ApiPrefixMiddleware)

# Register API routers
app.include_router(health_router)
app.include_router(targets_router)

# Mount static files for data/frames if directory exists or can be created
frames_path = get_data_frames_dir()
try:
    frames_path.mkdir(parents=True, exist_ok=True)
except OSError:
    pass

if frames_path.exists() and frames_path.is_dir():
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
