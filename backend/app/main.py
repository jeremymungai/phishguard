from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import HOST, PORT, is_api_key_configured
from app.database import init_db
from app.api.emails import router as emails_router
from app.api.simulation import router as simulation_router
from app.api.events import router as events_router

# Always ensure database tables exist
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="PhishGuard Security Intelligence API",
    description="Deterministic Email Security Signals + TypeSafe Jev System-1 Semantic Decision Engine",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(emails_router, prefix="/api/emails", tags=["Emails"])
app.include_router(simulation_router, prefix="/api/simulation", tags=["Simulation"])
app.include_router(events_router, prefix="/api/events", tags=["Events"])

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "PhishGuard",
        "is_live_api": is_api_key_configured(),
        "decision_layer": "TypeSafe Jev System-1"
    }

dist_path = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)