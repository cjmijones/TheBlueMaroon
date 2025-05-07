from fastapi import FastAPI
from app.api.routes_health import router as health_router
from app.api.routes_auth import router as auth_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Blue‑Maroon API")

# Setup CORS Middleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes

app.include_router(auth_router)
app.include_router(health_router)

@app.get("/")
def root():
    return {"message": "Welcome to the API!"}
