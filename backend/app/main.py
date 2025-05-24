from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.routes_health import router as health_router
from app.api.routes_auth import router as auth_router
from app.api.routes_token import router as token_router
from app.api.routes_test_tokens import router as test_token_router
from app.api.routes_username import router as user_router
from app.core.config import get_settings
from app.core.logging_config import setup_logging

# ────────────────────────────────
# Early init
# ────────────────────────────────
settings = get_settings()
setup_logging()

instr = Instrumentator()

@asynccontextmanager
async def lifespan(app: FastAPI):
    instr.expose(app)       # /metrics
    yield

app = FastAPI(
    title="Blue-Maroon API",
    lifespan=lifespan
)
instr.instrument(app)

# ────────────────────────────────
# Security / CORS
# ────────────────────────────────
@app.middleware("http")
async def validate_host(request: Request, call_next):
    host = request.headers.get("host", "").split(":")[0]
    if settings.debug or host in settings.allowed_hosts:
        return await call_next(request)
    raise HTTPException(status_code=400, detail="Invalid host header")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # vite dev server
        "http://127.0.0.1:5173",
        "http://0.0.0.0:8000/",
        "http://localhost:8000",   # container / prod
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ────────────────────────────────
# API routers live under /api/*
# ────────────────────────────────
api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(token_router)
api_router.include_router(health_router)
api_router.include_router(user_router)

if settings.env_type == "dev":
    api_router.include_router(test_token_router)

app.include_router(api_router)

# ────────────────────────────────
# React static assets  (/assets/*.js, css, svg…)
# ────────────────────────────────
SPA_DIR = Path(__file__).parent.parent / "frontend" / "dist"
ASSET_DIR = SPA_DIR / "assets"

# 1) serve real static files
app.mount("/assets", StaticFiles(directory=ASSET_DIR), name="assets")

# 2) root path -> index.html
@app.get("/", include_in_schema=False)
async def spa_root():
    return FileResponse(SPA_DIR / "index.html")

# 3) catch-all (everything that is NOT /api/* or /assets/*)
@app.get("/{full_path:path}", include_in_schema=False)
@app.head("/{full_path:path}", include_in_schema=False)
async def spa_fallback(full_path: str, request: Request):
    # Let API routes error normally if someone mis-routes
    if full_path.startswith("api"):
        raise HTTPException(status_code=404)
    return FileResponse(SPA_DIR / "index.html")

# local dev entry-point
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
