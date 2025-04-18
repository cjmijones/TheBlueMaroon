from fastapi import FastAPI
from app.api.routes_health import router as health_router
from app.api.routes_auth import router as auth_router

app = FastAPI()

# Register API routes

app.include_router(auth_router)
app.include_router(health_router)

@app.get("/")
def root():
    return {"message": "Welcome to the API!"}