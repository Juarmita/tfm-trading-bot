from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.market import router as market_router
from app.api.v1.trading import router as trading_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="FastAPI Backend for TFM Trading Bot",
)

# CORS middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar Routers
app.include_router(market_router, prefix="/api/v1/market", tags=["Market Data"])
app.include_router(trading_router, prefix="/api/v1/trading", tags=["AI Trading Engine"])

@app.get("/")
def read_root():
    return {"message": f"Welcome to the {settings.PROJECT_NAME} API!"}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}


