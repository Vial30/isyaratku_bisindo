<div align="center">

# 🤟 Isyaratku: Real-Time Word-Level BISINDO Sign Recognition Using Deep Residual Bi-LSTM Fusion

[![Python Version](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![CUDA](https://img.shields.io/badge/NVIDIA_CUDA-Acceleration-76B900?style=for-the-badge&logo=nvidia&logoColor=white)](https://developer.nvidia.com/cuda-zone)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React Native](https://img.shields.io/badge/React_Native-Expo_SDK_54-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Accuracy](https://img.shields.io/badge/LOSO_Accuracy-98.99%25-brightgreen?style=for-the-badge)](https://github.com)

<p align="center">
  <b>Sistem Pengenalan Bahasa Isyarat Indonesia (BISINDO) Tingkat Kata Secara Real-Time Menggunakan Arsitektur Dual-Stream Deep Residual Bi-LSTM Fusion Berbasis Mobile Klien-Server.</b>
</p>

</div>

---

## 📌 Ringkasan Penelitian (*Abstract*)

Bahasa Isyarat Indonesia (**BISINDO**) merupakan media komunikasi utama bagi komunitas Tuli di Indonesia. Namun, perbedaan struktur isyarat dinamis serta variasi bentuk tangan dan postur tubuh antar individu (*inter-signer variability*) menjadi tantangan besar dalam computer vision.

Proyek penelitian ini menghadirkan **Isyaratku**, sebuah sistem pengenalan isyarat BISINDO tingkat kata (32 kelas kosakata terisolasi) secara real-time yang menggabungkan:
1. **Dual-Stream Spatial-Temporal Feature Extraction**:
   - **Stream 1 (Holistic 282-Dim)**: 141 Posisi Spasial (*Pose Anchors* + *Local Hand* + *Global Hand*) + 141 Vektor Kecepatan Kinematis ($\Delta pos$).
   - **Stream 2 (Hand-Only 63-Dim)**: 63 Koordinat bentuk konfigurasi jari tangan lokal (invarian terhadap rotasi/skala tubuh).
2. **Deep Residual Bi-LSTM + Temporal Attention Fusion**:
   - Mengekstrak ketergantungan temporal sekuens 16-frame dengan mekanisme atensi adaptif.
   - Menggabungkan probabilitas kedua aliran (*Soft Voting 50:50*).
3. **Mobile Client-Server Architecture**:
   - Frontend modern (React Native + Expo) terhubung secara asinkron via WebSocket ke server FastAPI berakselerasi NVIDIA CUDA.

---

## 📊 Hasil Evaluasi & Tolok Ukur (*Benchmark*)

Sistem dievaluasi secara ketat menggunakan metode **Leave-One-Subject-Out (LOSO) Cross-Validation** pada dataset **Word-Level BISINDO (WL-BISINDO)** yang melibatkan 5 peraga isyarat (4 subjek pengujian independen + 1 subjek pelatihan tambahan):

| Subjek Uji (LOSO Fold) | Akurasi (%) | Presisi (Macro) | Recall (Macro) | F1-Score (Macro) |
| :--- | :---: | :---: | :---: | :---: |
| **Signer 1 (Subjek 1)** | **99.17%** | 0.992 | 0.992 | 0.992 |
| **Signer 2 (Subjek 2)** | **98.96%** | 0.990 | 0.990 | 0.990 |
| **Signer 3 (Subjek 3)** | **98.96%** | 0.990 | 0.990 | 0.990 |
| **Signer 4 (Subjek 4)** | **99.38%** | 0.994 | 0.994 | 0.994 |
| **RATA-RATA KESELURUHAN** | **98.99%** | **0.991** | **0.991** | **0.991** |

> ⚡ **Latensi Inferensi Model**: **~2.3 ms / sekuens** pada GPU NVIDIA CUDA.

---

## 🏗️ Arsitektur Sistem (*System Architecture*)

```
[ Kamera Mobile (HP) ]
         │ (Streaming Frame Kompresi Cepat via WebSocket)
         ▼
[ FastAPI Backend Engine ]
         │
         ├───► [ MediaPipe Vision Pipeline ] ──► 141 Posisi Sendi + 141 Kecepatan (Δpos)
         │
         ├───► [ Stream 1: Holistic Model (282-Dim) ] ──► Probabilitas P(282)
         │           └─ Residual Proj -> 2-Layer Bi-LSTM -> Temporal Attention
         │
         ├───► [ Stream 2: Hand-Only Model (63-Dim) ]  ──► Probabilitas P(63)
         │           └─ Residual Proj -> 2-Layer Bi-LSTM -> Temporal Attention
         │
         └───► [ Ensemble Soft Voting Fusion (50:50) ] ──► ArgMax Predicted Class (32 Kata)
         │
         ▼ (Hasil JSON Real-Time: Kata, Confidence, Latensi)
[ Layar Aplikasi Mobile (Expo) ]
```

---

## 📂 Struktur Repositori

```
├── isyaratku_bisindo_backend/      # Backend Server FastAPI (WebSocket & AI Engine)
│   ├── app/
│   │   ├── config.py               # Konfigurasi & Hyperparameter
│   │   ├── models/                 # Definisi Arsitektur Dual-Stream Ensemble
│   │   ├── routes/                 # WebSocket Endpoint (/v1/recognize) & REST API
│   │   └── services/               # MediaPipe Extractor & Buffer Sekuens
│   ├── weights/                    # Checkpoints Model PyTorch Terbaik (.pth)
│   ├── Dockerfile                  # Containerization untuk IDCloudHost VPS / Cloud
│   ├── run.py                      # Script Menjalankan Server
│   └── requirements.txt            # Dependensi Python Backend
│
├── deploy/                         # Skrip & Konfigurasi Deployment IDCloudHost
│   ├── setup_idcloudhost.sh        # Skrip Instalasi 1-Klik Ubuntu VPS IDCloudHost
│   └── isyaratku-backend.service   # Systemd Service Unit File
│
├── nginx/                          # Konfigurasi Nginx Reverse Proxy (SSL & WSS)
│   ├── nginx.conf
│   └── conf.d/bisindo.conf
│
├── docker-compose.yml              # Orkestrasi Backend + Nginx Reverse Proxy
│
├── isyaratku_bisindo_frontend/     # Aplikasi Mobile (React Native + Expo SDK 54)
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx           # Kamera Real-Time Translator (Mode Auto & Rekam)
│   │   │   ├── kamus.tsx           # Kamus 32 Kosakata Isyarat (Ilustrasi Vektor)
│   │   │   └── pengaturan.tsx      # Info Arsitektur, Uji Ping Latensi, & Preferensi
│   │   │   └── _layout.tsx         # Tab Bar Navigation
│   │   └── _layout.tsx             # Root Navigation
│   ├── assets/                     # Ikon, Gambar, dan Asset Vektor
│   └── package.json                # Dependensi Frontend
│
└── model/                          # Skrip Pelatihan, Bobot Model & Hasil Evaluasi Bab IV
    ├── training/                   # Skrip Pelatihan LOSO CV & Ekstraksi Koordinat
    │   ├── train_local_bisindo.py  # Pelatihan PyTorch LOSO Cross-Validation
    │   ├── train_colab_bisindo.py  # Skrip Pelatihan di Google Colab GPU
    │   └── extract_keypoints.py    # Ekstraksi Koordinat MediaPipe
    ├── weights/                    # Bobot Model PyTorch & MediaPipe Landmarkers
    │   ├── best_bisindo_residual_bilstm.pth
    │   ├── hand_landmarker.task
    │   └── pose_landmarker.task
    └── evaluation/                 # Grafik & Metrik Hasil Evaluasi LOSO
        ├── confusion_matrix_bab4.png
        ├── evaluation_metrics_bab4.json
        └── RANGKUMAN_HASIL_TRAINING_BAB4_5.md
```

---

## 🚀 Panduan Memulai (*Quickstart Guide*)

### 1. Prasyarat (*Prerequisites*)
* **Python 3.10+** (disarankan dengan GPU NVIDIA & CUDA Toolkit) atau **Docker & Docker Compose**
* **Node.js 18+** & npm / yarn
* **Aplikasi Expo Go** pada perangkat Android / iOS

---

### 2. Menjalankan Backend Server (Lokal)

```bash
# Masuk ke direktori backend
cd isyaratku_bisindo_backend

# Install dependensi
pip install -r requirements.txt

# Jalankan server FastAPI
python run.py
```
* Server akan aktif pada: `ws://0.0.0.0:8000/v1/recognize`
* Dokumentasi Swagger REST API: `http://localhost:8000/docs`

---

### 3. Deployment Produksi ke IDCloudHost (Cloud VPS) 🌐

Proyek ini telah dilengkapi dengan konfigurasi **Docker Compose**, **Nginx Reverse Proxy (WSS/SSL)**, dan **skrip instalasi 1-klik** untuk IDCloudHost:

```bash
# 1. SSH ke VPS IDCloudHost Anda
ssh root@IP_SERVER_IDCLOUDHOST

# 2. Clone repositori
git clone https://github.com/Vial30/isyaratku_bisindo.git && cd isyaratku_bisindo

# 3. Jalankan skrip setup otomatis 1-klik
sudo bash deploy/setup_idcloudhost.sh
```

> 📖 **Panduan Lengkap IDCloudHost**: Lihat [DEPLOY_IDCLOUDHOST.md](DEPLOY_IDCLOUDHOST.md) untuk petunjuk lengkap pengaturan domain, SSL gratis Certbot (`wss://`), dan CI/CD GitHub Actions.

---

### 4. Menjalankan Aplikasi Mobile Frontend

```bash
# Masuk ke direktori frontend
cd isyaratku_bisindo_frontend

# Install dependensi
npm install

# Jalankan Metro Bundler
npx expo start
```
* Buka aplikasi **Expo Go** pada ponsel Anda, lalu scan QR Code yang muncul pada terminal.
* Pada menu **Pengaturan**, masukkan URL server WebSocket IDCloudHost Anda (`wss://api.domain-anda.com/v1/recognize` atau `ws://IP_VPS:8000/v1/recognize`).

---

## 📚 Kosakata Isyarat yang Didukung (32 Kelas)

| Kategori | Daftar Kosakata BISINDO |
| :--- | :--- |
| **Sapaan & Relasi** | `Saya`, `Terima kasih`, `Maaf`, `Teman`, `Keluarga`, `Tuli` |
| **Kata Tanya** | `Apa`, `Siapa`, `Kapan`, `Di mana`, `Mengapa`, `Bagaimana`, `Cari` |
| **Warna** | `Merah`, `Kuning`, `Hijau`, `Hitam` |
| **Waktu** | `Hari`, `Pagi`, `Siang`, `Sore`, `Malam` |
| **Kegiatan & Objek** | `Air`, `Belajar`, `Ingat`, `Lagi`, `Makan`, `Motor`, `Dengar`, `Berangkat`, `Datang`, `Rumah` |

---

## 🛠️ Teknologi yang Digunakan (*Tech Stack*)

* **Deep Learning Framework**: PyTorch, Torchvision, ONNX Runtime
* **Computer Vision**: Google MediaPipe (Hand Landmarker & Pose Landmarker), OpenCV
* **Backend API**: FastAPI, Uvicorn, WebSockets, NumPy
* **Mobile Frontend**: React Native, Expo SDK 54, TypeScript, React Navigation
* **Hardware Acceleration**: NVIDIA CUDA, TensorRT / DirectML

---

## 📄 Lisensi & Sitasi (*License & Citation*)

Proyek ini dilisensikan di bawah [MIT License](LICENSE).

Jika Anda menggunakan repositori atau kode penelitian ini untuk publikasi ilmiah, silakan sitasi sebagai berikut:

```bibtex
@misc{isyaratku2026,
  author = {Jovial Wahyu Aji Pradhana},
  title = {Real-Time Word-Level BISINDO Sign Recognition Using Deep Residual Bi-LSTM Fusion},
  year = {2026},
  publisher = {GitHub},
  howpublished = {\url{https://github.com/Vial30/isyaratku_bisindo}}
}
```

---

<div align="center">
  <b>Dikembangkan dengan dedikasi untuk Inklusivitas & Aksesibilitas Komunitas Tuli Indonesia 🇮🇩</b>
</div>
