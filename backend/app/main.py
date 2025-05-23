from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes_health import router as health_router
from app.api.routes_auth import router as auth_router
from app.api.routes_token import router as token_router
from app.api.routes_test_tokens import router as test_token_router
from app.api.routes_username import router as user_router
from app.core.config import get_settings
from app.core.logging_config import setup_logging
from contextlib import asynccontextmanager
from prometheus_fastapi_instrumentator import Instrumentator

# Instantiate settings and logging early
settings = get_settings()
setup_logging()

# Setup Prometheus
instrumentator = Instrumentator()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Expose /metrics route here (route-level, safe post-startup)
    instrumentator.expose(app)
    yield

# Create FastAPI app with lifespan
app = FastAPI(title="Blue‑Maroon API", lifespan=lifespan)

# Instrument app BEFORE startup
instrumentator.instrument(app)

# Host validation middleware
@app.middleware("http")
async def validate_host(request: Request, call_next):
    host = request.headers.get("host", "").split(":")[0]
    if settings.debug or host in settings.allowed_hosts:
        return await call_next(request)
    raise HTTPException(status_code=400, detail="Invalid host header")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(token_router)
app.include_router(health_router)
app.include_router(user_router)

if settings.env_type == "dev":
    app.include_router(test_token_router)

@app.get("/")
def root():
    return {"message": "Welcome to the API!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
