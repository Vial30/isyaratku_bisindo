# ==============================================================================
# Dockerfile - Isyaratku BISINDO Real-Time Backend
# Tailored & Optimized for IDCloudHost 2 Core / 2GB RAM / 20GB Storage
# ==============================================================================

FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=8000 \
    OMP_NUM_THREADS=2 \
    MKL_NUM_THREADS=2 \
    DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /app

# Install essential system dependencies for OpenCV Headless and MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-optimized PyTorch (saves ~2.5GB disk space on 20GB VPS) & dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code, weights, and MediaPipe models
COPY app/ ./app/
COPY weights/ ./weights/
COPY mediapipe_models/ ./mediapipe_models/
COPY run.py .

# Expose FastAPI & WebSocket port
EXPOSE 8000

# Health check to ensure service readiness
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start the FastAPI server using Uvicorn (Single worker for memory efficiency)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
