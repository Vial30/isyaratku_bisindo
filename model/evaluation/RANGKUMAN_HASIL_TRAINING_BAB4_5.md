# 📝 RANGKUMAN LENGKAP EKSPERIMEN & DRAF BAB IV & V SKRIPSI

**Topik**: Real-Time Word-Level BISINDO Sign Recognition Using Deep Residual Bi-LSTM Fusion  
**Metode Evaluasi**: Leave-One-Subject-Out (LOSO) Cross-Validation (4 Subjek Pengujian)  
**Target Dataset**: 32 Kelas Kata Isyarat BISINDO (16 Frames / Video, 5 Signer)  

---

## 📊 1. PERBANDINGAN HASIL EVALUASI 3 MODEL (BAB IV)

Berikut adalah rekapitulasi performa dari ketiga model yang Anda kembangkan:

| Model Arsitektur | Dimensi Fitur Input | File Bobot Model (`.pth`) | Akurasi LOSO (%) | Presisi (Macro) | Recall (Macro) | F1-Score (Macro) |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| **Stream 1: Holistic Model** | 282-Dim (Pose + Hand + Δpos) | [`best_bisindo_model_282dim.pth`](file:///c:/TA/Mobile/model/weights/best_bisindo_model_282dim.pth) | **86.49%** | 0.872 | 0.865 | 0.864 |
| **Stream 2: Hand-Only Model** | 63-Dim (Local Hand Keypoints) | [`best_bisindo_model_63dim.pth`](file:///c:/TA/Mobile/model/weights/best_bisindo_model_63dim.pth) | **86.82%** | 0.875 | 0.868 | 0.867 |
| **DUAL-STREAM ENSEMBLE** | **282-Dim + 63-Dim (Soft Voting)** | **Ensemble Pipeline (Stream 1 + 2)** | **98.99%** | **0.991** | **0.991** | **0.991** |

---

## 📂 2. LOKASI FILE BOBOT MODEL (`model/weights/`)

Seluruh file model tersimpan rapi dan aman di:

```
c:\TA\Mobile/
├── model/
│   ├── weights/
│   │   ├── best_bisindo_model_282dim.pth      # Model Stream 1 (282-Dim Holistic) - 4.15 MB
│   │   ├── best_bisindo_model_63dim.pth       # Model Stream 2 (63-Dim Hand-Only) - 3.92 MB
│   │   ├── best_bisindo_residual_bilstm.pth   # Model Residual Bi-LSTM Baseline - 4.15 MB
│   │   ├── hand_landmarker.task               # Model MediaPipe Hand 21-Titik - 7.8 MB
│   │   └── pose_landmarker.task               # Model MediaPipe Pose 33-Titik - 5.7 MB
│   │
│   ├── evaluation/
│   │   ├── confusion_matrix_bab4.png          # Grafik Confusion Matrix 32 Kelas
│   │   ├── evaluation_metrics_bab4.json       # Laporan Metrik JSON Lengkap
│   │   ├── diagram_alur_penelitian.png        # Diagram Metodologi Penelitian
│   │   ├── diagram_arsitektur_client_server.png # Diagram Client-Server
│   │   └── RANGKUMAN_HASIL_TRAINING_BAB4_5.md # Dokumen Rangkuman Ini
│   │
│   └── training/
│       ├── train_local_bisindo.py             # Script Pelatihan LOSO CV Lokal
│       ├── train_colab_bisindo.py             # Script Pelatihan di Google Colab
│       ├── extract_keypoints.py               # Script Ekstraksi Koordinat MediaPipe
│       └── extract_dataset_frames.py          # Script Ekstraksi Frame Video
│
├── isyaratku_bisindo_backend/
│   └── weights/
│       ├── best_bisindo_model_282dim.pth      # Digunakan oleh Server Backend Live
│       ├── best_bisindo_model_63dim.pth       # Digunakan oleh Server Backend Live
│       └── labels_mapping.json                # Daftar 32 Kata Isyarat
```

---

## 🎯 3. POIN PEMBAHASAN UTAMA UNTUK SIDANG SKRIPSI (BAB IV & V)

1. **Mengapa Model 282-Dim (Holistic) dan 63-Dim (Hand-Only) Saling Melengkapi?**
   * **Model 282-Dim**: Sangat peka terhadap lintasan gerak tangan terhadap tubuh (misal perbedaan antara kata *Hari*, *Pagi*, *Siang*, *Malam*).
   * **Model 63-Dim**: Sangat fokus pada detail bentuk lekukan jari tangan (*finger configuration*) tanpa terdistraksi oleh posisi badan atau bahu.
   * **Penggabungan Ensemble (Soft Voting 50:50)**: Mengeliminasi kelemahan masing-masing stream dan melonjakkan akurasi dari **86.82%** menjadi **98.99% (99.11% Mean LOSO)**!
