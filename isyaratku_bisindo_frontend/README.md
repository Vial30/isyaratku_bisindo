# 📱 Isyaratku BISINDO Mobile App (Android Client)

Aplikasi klien Android penerjemah Bahasa Isyarat Indonesia (**BISINDO**) tingkat kata secara *real-time* yang terhubung ke server backend **IDCloudHost Cloud VPS** via **WebSocket Secure (WSS)**.

---

## 🛠️ Tech Stack Frontend
* **Platform**: Android OS (Android SDK 34 / Android 14 Ready)
* **Framework**: React Native 0.76+ & Expo SDK 54
* **Language**: TypeScript 5.x
* **Camera Streaming**: Expo Camera (Fast Frame Capture)
* **Network Protocol**: WebSockets (`wss://` / `ws://`)
* **State & Storage**: React Hooks & AsyncStorage

---

## 🚀 Cara Menjalankan & Membangun Aplikasi Android

### 1. Menjalankan di Perangkat Android (Development Mode)
```bash
# 1. Install dependensi
npm install

# 2. Jalankan di perangkat Android fisik / emulator via Android SDK
npx expo run:android
```

---

### 2. Membangun File APK Android Standalone (.apk) Siap Pakai
Anda dapat membuat file `.apk` mandiri yang dapat langsung diinstal di semua smartphone Android tanpa perlu laptop:

```bash
# Install EAS CLI secara global (jika belum)
npm install -g eas-cli

# Login ke akun Expo
eas login

# Build APK Android mandiri
eas build -p android --profile preview
```
Setelah proses build di cloud selesai, unduh dan instal file `.apk` ke ponsel Android Anda.

---

## ⚙️ Menghubungkan ke Server IDCloudHost

1. Buka aplikasi **Isyaratku** di smartphone Android.
2. Masuk ke tab **Pengaturan**.
3. Masukkan URL server IDCloudHost Anda:
   * Dengan Domain/SSL: `wss://api.domain-anda.com/v1/recognize`
   * Dengan IP VPS: `ws://IP_IDCLOUDHOST:8000/v1/recognize`
4. Tekan **"Uji Latensi / Ping"** untuk memastikan koneksi berhasil.
5. Tekan **"Simpan"**.
