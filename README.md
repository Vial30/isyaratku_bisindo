<div align="center">

# 🤟 Isyaratku: Real-Time Word-Level BISINDO Sign Recognition Using Deep Residual Bi-LSTM Fusion

[![IDCloudHost](https://img.shields.io/badge/Hosted_on-IDCloudHost_Cloud_VPS-0070F3?style=for-the-badge&logo=icloud&logoColor=white)](https://idcloudhost.com)
[![Android](https://img.shields.io/badge/Android-SDK_34_(APK)-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-Production_Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-Deep_Bi--LSTM-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Nginx](https://img.shields.io/badge/Nginx-Reverse_Proxy_WSS-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org)
[![Accuracy](https://img.shields.io/badge/LOSO_Accuracy-98.99%25-brightgreen?style=for-the-badge)](https://github.com/Vial30/isyaratku_bisindo)

<p align="center">
  <b>Sistem Pengenalan Bahasa Isyarat Indonesia (BISINDO) Tingkat Kata Secara Real-Time Menggunakan Arsitektur Dual-Stream Deep Residual Bi-LSTM Fusion Berbasis Server Cloud IDCloudHost & Aplikasi Mobile Android.</b>
</p>

</div>

---

## 📌 Ringkasan Penelitian (*Abstract*)

Bahasa Isyarat Indonesia (**BISINDO**) merupakan media komunikasi utama bagi komunitas Tuli di Indonesia. Namun, perbedaan struktur isyarat dinamis serta variasi bentuk tangan dan postur tubuh antar individu (*inter-signer variability*) menjadi tantangan besar dalam computer vision.

Proyek penelitian ini menghadirkan **Isyaratku**, sebuah sistem pengenalan isyarat BISINDO tingkat kata (32 kelas kosakata terisolasi) secara *real-time* yang menggabungkan:
1. **Dual-Stream Spatial-Temporal Feature Extraction**:
   - **Stream 1 (Holistic 282-Dim)**: 141 Posisi Spasial (*Pose Anchors* + *Local Hand* + *Global Hand*) + 141 Vektor Kecepatan Kinematis ($\Delta pos$).
   - **Stream 2 (Hand-Only 63-Dim)**: 63 Koordinat bentuk konfigurasi jari tangan lokal (invarian terhadap rotasi/skala tubuh).
2. **Deep Residual Bi-LSTM + Temporal Attention Fusion**:
   - Mengekstrak ketergantungan temporal sekuens 16-frame dengan mekanisme atensi adaptif.
   - Menggabungkan probabilitas kedua aliran (*Soft Voting 50:50*).
3. **Cloud-Native & Android Client Architecture**:
   - **Backend Server**: Di-deploy pada **IDCloudHost Cloud VPS** (Datacenter Jakarta) terakselerasi CPU multi-threading, diproteksi Nginx Reverse Proxy dengan enkripsi SSL/WSS (*WebSocket Secure*).
   - **Frontend Klien**: Aplikasi mandiri Android (**Standalone .apk**) yang dibangun menggunakan **Android SDK** & React Native untuk interaksi real-time tanpa latensi.

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

> ⚡ **Latensi Inferensi Model**: **~2.3 ms / sekuens** pada GPU NVIDIA CUDA dan **~5–15 ms** pada IDCloudHost Cloud VPS CPU.

---

## 🏗️ Arsitektur Sistem (*System Architecture*)

```
[ Smartphone Android (Aplikasi Standalone APK / Android SDK) ]
                     │
                     │ Streaming Frame Kamera via WebSocket Secure (WSS :443)
                     ▼
[ Server IDCloudHost Cloud VPS (Datacenter Jakarta) ]
                     │
                     ├─► [ Nginx Reverse Proxy + SSL Let's Encrypt ]
                     │        │
                     │        ▼
                     └─► [ Docker Container: FastAPI Backend Engine ]
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
                              ▼ (Hasil JSON Real-Time: Kata, Confidence %, Latensi Jaringan)
[ Tampilan Antarmuka Aplikasi Android ]
```

---

## 📂 Struktur Repositori

```
├── isyaratku_bisindo_backend/      # Backend Server FastAPI (WebSocket & AI Engine)
│   ├── app/
│   │   ├── config.py               # Konfigurasi Path & Hyperparameter
│   │   ├── models/                 # Definisi Arsitektur Dual-Stream Ensemble
│   │   ├── routes/                 # WebSocket Endpoint (/v1/recognize) & REST API
│   │   └── services/               # MediaPipe Extractor & Buffer Sekuens
│   ├── weights/                    # Checkpoints Model PyTorch Terbaik (.pth)
│   ├── Dockerfile                  # Containerization Khusus IDCloudHost
│   ├── run.py                      # Skrip Menjalankan Server
│   └── requirements.txt            # Dependensi Python Backend
│
├── deploy/                         # Skrip & Konfigurasi Deployment IDCloudHost
│   ├── setup_idcloudhost.sh        # Skrip Instalasi Otomatis 1-Klik (2C/2G/20G VPS)
│   └── isyaratku-backend.service   # Systemd Service Unit File
│
├── nginx/                          # Konfigurasi Nginx Reverse Proxy (SSL & WSS)
│   ├── nginx.conf
│   └── conf.d/bisindo.conf
│
├── docker-compose.yml              # Orkestrasi Docker (Backend + Nginx + Log Rotation)
│
├── isyaratku_bisindo_frontend/     # Aplikasi Mobile Android (React Native + Android SDK)
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx           # Kamera Real-Time Translator (Mode Auto & Rekam)
│   │   │   ├── kamus.tsx           # Kamus 32 Kosakata Isyarat (Ilustrasi Vektor)
│   │   │   └── pengaturan.tsx      # Konfigurasi URL IDCloudHost, Tes Ping & Latensi
│   │   │   └── _layout.tsx         # Tab Bar Navigation
│   │   └── _layout.tsx             # Root Navigation
│   ├── eas.json                    # Konfigurasi Build APK Android Standalone
│   ├── assets/                     # Ikon, Gambar, dan Asset Vektor
│   └── package.json                # Dependensi Frontend
│
├── .github/workflows/              # CI/CD GitHub Actions
│   └── deploy.yml                  # Auto Test & Deploy ke IDCloudHost via SSH
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

## 🚀 Panduan Deployment & Instalasi

### 1. Menjalankan Server di IDCloudHost Cloud VPS 🌐

Server backend siap di-deploy secara instan ke server **IDCloudHost** (dioptimasi untuk paket 2 Core / 2 GB RAM / 20 GB Storage):

```bash
# 1. Login ke VPS IDCloudHost melalui SSH
ssh root@IP_SERVER_IDCLOUDHOST

# 2. Clone repositori dari GitHub
git clone https://github.com/Vial30/isyaratku_bisindo.git && cd isyaratku_bisindo

# 3. Jalankan skrip setup otomatis 1-klik
sudo bash deploy/setup_idcloudhost.sh
```

* Backend akan langsung aktif dan terproteksi di `http://IP_SERVER:80` dan `ws://IP_SERVER:8000/v1/recognize`.
* Untuk mengaktifkan sertifikat SSL gratis (`wss://`), ikuti panduan lengkap di [DEPLOY_IDCLOUDHOST.md](DEPLOY_IDCLOUDHOST.md).

---

### 2. Membangun Aplikasi Android Standalone (.apk) 📱

Aplikasi mobile dapat dikompilasi menjadi file **APK** yang siap diinstal di semua ponsel Android:

```bash
# Masuk ke direktori frontend
cd isyaratku_bisindo_frontend

# Install dependensi
npm install

# Build file APK Android mandiri
npx eas build -p android --profile preview
```
* Setelah build selesai, unduh file `.apk` dan pasang di smartphone Android Anda.
* Buka menu **Pengaturan** di aplikasi, masukkan URL server IDCloudHost (`wss://api.domain-anda.com/v1/recognize` atau `ws://IP_VPS:8000/v1/recognize`), dan tekan **Simpan**.

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

* **Cloud Infrastructure**: IDCloudHost Cloud VPS (Ubuntu Linux, Datacenter Jakarta), Docker & Docker Compose, Nginx Reverse Proxy, Let's Encrypt SSL.
* **Deep Learning Framework**: PyTorch 2.x, Torchvision, ONNX Runtime.
* **Computer Vision**: Google MediaPipe (Hand Landmarker & Pose Landmarker), OpenCV Headless.
* **Backend API & Streaming**: FastAPI, Uvicorn, WebSockets AsyncIO, NumPy.
* **Mobile Client**: Android SDK (Target Android 14/SDK 34), React Native, Expo SDK 54, TypeScript, EAS Build.

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
  <sub>Dikembangkan untuk Penelitian Skripsi / Tugas Akhir — Real-Time Word-Level BISINDO Recognition.</sub>
</div>
