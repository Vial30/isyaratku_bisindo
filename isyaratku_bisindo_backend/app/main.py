"""
FastAPI Main Application Entrypoint for Isyaratku BISINDO Backend.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import ALLOWED_ORIGINS, NUM_CLASSES
from app.models.ensemble import recognizer
from app.routes.rest import router as rest_router
from app.routes.websocket import router as websocket_router
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("=" * 60)
    logger.info("🚀 MEMULAI SERVER BACKEND ISYARATKU BISINDO")
    logger.info(f"⚡ Model: Dual-Stream Ensemble (98.99% Akurasi LOSO)")
    logger.info(f"📊 Jumlah Kelas: {NUM_CLASSES} Kata Isyarat")
    logger.info(f"🖥️ Device Komputasi: {recognizer.device}")
    logger.info("=" * 60)
    yield
    # Shutdown
    logger.info("🛑 Menghentikan server backend Isyaratku BISINDO...")


app = FastAPI(
    title="Isyaratku BISINDO Backend API",
    description=(
        "Backend API & WebSocket Server untuk Pengenalan Bahasa Isyarat BISINDO "
        "menggunakan Deep Residual Bi-LSTM Ensemble Fusion (282-Dim Holistic + 63-Dim Hand-Only)."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration for Mobile & Web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(rest_router)
app.include_router(websocket_router)


@app.get("/")
def root():
    """Root endpoint welcoming the client and providing documentation links."""
    return {
        "app": "Isyaratku BISINDO Recognition Backend",
        "status": "online",
        "version": "1.0.0",
        "model": "Dual-Stream Ensemble Deep Residual Bi-LSTM Fusion",
        "accuracy": "98.99%",
        "docs_url": "/docs",
        "websocket_endpoint": "/v1/recognize",
        "rest_predict_endpoint": "/api/predict/video",
    }
