# 🚀 Isyaratku BISINDO Backend API & WebSocket Server

Backend server untuk aplikasi pengenalan bahasa isyarat BISINDO (Word-Level) menggunakan arsitektur **Dual-Stream Ensemble Deep Residual Bi-LSTM Fusion** (Akurasi **98.99%**).

---

## 📌 1. Arsitektur Model

Backend ini mengintegrasikan dua model deep learning yang digabungkan secara *Soft Voting Probability*:
1. **Stream 1: Model Holistic (282-Dim)**
   - MediaPipe Pose Anchors (Hidung, Telinga L/R, Bahu L/R = 15)
   - MediaPipe Hand Landmarks (21 Joints x 3D Shape Lokal = 63)
   - MediaPipe Hand Landmarks (21 Joints x 3D Posisi Global terhadap Tubuh = 63)
   - Kinematic Velocity (Delta Posisi antar frame = 141)
   - **Bobot Ensemble: 50%**
2. **Stream 2: Model Hand-Only (63-Dim)**
   - 21 Hand Landmarks Shape Koordinat 3D (63)
   - **Bobot Ensemble: 50%**

---

## 📂 2. Struktur Direktori

```
isyaratku_bisindo_backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # Aplikasi FastAPI & Lifespan
│   ├── config.py                  # Konfigurasi Path & Hyperparameters
│   ├── models/
│   │   ├── __init__.py
│   │   ├── architecture.py        # Definisi PyTorch Deep Residual Bi-LSTM
│   │   └── ensemble.py            # BISINDOEnsembleRecognizer (Soft Voting)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── keypoint_extractor.py  # MediaPipe Hand & Pose Landmarker
│   │   └── frame_buffer.py        # Sliding Window 16 Frame & Interpolasi
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── rest.py                # REST Endpoints (/api/health, /api/model-info, dll)
│   │   └── websocket.py           # WebSocket Real-Time (/v1/recognize)
│   └── utils/
│       ├── __init__.py
│       └── logger.py              # Logging Terstruktur
├── weights/                       # Bobot Model PyTorch & Label JSON
│   ├── best_bisindo_model_282dim.pth
│   ├── best_bisindo_model_63dim.pth
│   └── labels_mapping.json
├── mediapipe_models/              # File Task MediaPipe
│   ├── hand_landmarker.task
│   └── pose_landmarker.task
├── Dockerfile                     # Containerization untuk IDCloudHost
├── requirements.txt               # Daftar Dependensi Python
├── run.py                         # Skrip Menjalankan Server
└── README.md
```

---

## ⚡ 3. Cara Menjalankan Server

### A. Menjalankan Lokal (Python Direct)
```bash
# 1. Masuk ke direktori backend
cd isyaratku_bisindo_backend

# 2. Install dependensi
pip install -r requirements.txt

# 3. Jalankan server
python run.py
```
Server akan aktif di `http://0.0.0.0:8000` dan WebSocket di `ws://0.0.0.0:8000/v1/recognize`.

### B. Menjalankan dengan Docker Container
```bash
# Build image
docker build -t isyaratku-backend:latest .

# Jalankan container
docker run -d --name isyaratku_backend -p 8000:8000 isyaratku-backend:latest
```

### C. Deployment ke Cloud VPS IDCloudHost
Lihat panduan lengkap di [../DEPLOY_IDCLOUDHOST.md](../DEPLOY_IDCLOUDHOST.md) atau jalankan:
```bash
sudo bash ../deploy/setup_idcloudhost.sh
```

---

## 🔌 4. Dokumentasi Endpoint

### 🌐 REST Endpoints
* **`GET /`** — Status server dan ringkasan API.
* **`GET /docs`** — Dokumentasi interaktif Swagger UI.
* **`GET /api/health`** — Status kesehatan server, GPU CUDA, dan model.
* **`GET /api/model-info`** — Detail lengkap arsitektur ensemble & metrik evaluasi.
* **`GET /api/labels`** — Daftar 32 kosakata kelas kata isyarat BISINDO.
* **`POST /api/predict/keypoints`** — Prediksi langsung dari array koordinat keypoints `(16, 282)`.
* **`POST /api/predict/video`** — Prediksi dari file video MP4 yang diunggah.

### 📡 WebSocket Endpoint (Real-Time Streaming)
* **`ws://localhost:8000/v1/recognize`** (atau `/ws/recognize`)

#### Format Data yang Dikirim dari Frontend (Mobile):
Frontend mengirim frame kamera secara berkala sebagai **binary JPEG** atau JSON:
```json
{
  "frame": "base64_encoded_jpeg_string..."
}
```

#### Format Respons dari Backend:
```json
{
  "type": "prediction",
  "predicted_gloss": "TERIMA KASIH",
  "english": "Thank you",
  "confidence": 0.9899,
  "confidence_percent": 98.99,
  "class_id": 10,
  "latency_ms": 2.31,
  "hand_detected": true,
  "top_candidates": [
    { "class_id": 10, "gloss": "Terima kasih", "english": "Thank you", "confidence": 0.9899 },
    { "class_id": 6, "gloss": "Maaf", "english": "Sorry", "confidence": 0.0051 },
    { "class_id": 9, "gloss": "Saya", "english": "I", "confidence": 0.0022 }
  ]
}
```
