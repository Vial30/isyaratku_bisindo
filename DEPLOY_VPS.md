# 🚀 Panduan Lengkap Deployment Isyaratku BISINDO ke Cloud VPS (8 GB RAM)

Panduan resmi langkah-demi-langkah untuk melakukan *deploy* backend server **Isyaratku BISINDO** (FastAPI + PyTorch + MediaPipe + WebSocket Real-Time) ke **Cloud VPS Mandiri** (Ubuntu 22.04 LTS / 24.04 LTS / Debian) dengan spesifikasi **8 GB RAM**.

---

## 📌 Mengapa Menggunakan Cloud VPS Mandiri (8 GB RAM)?

1. **Performa Tinggi & Tanpa Hambatan (High Headroom)**:
   - Server dengan **8 GB RAM** memberikan keleluasaan penuh untuk menjalankan model PyTorch, MediaPipe pipeline, dan menangani puluhan koneksi WebSocket secara bersamaan dengan memori bebas yang sangat melimpah.
2. **Multi-Threading CPU Dinamis**:
   - Inferensi PyTorch memanfaatkan seluruh core CPU yang tersedia di VPS secara efisien (*low latency* ~5–12 ms).
3. **Dukungan Penuh WebSocket Long-Lived (`wss://` & `ws://`)**:
   - Tidak ada timeout koneksi 30-60 detik seperti arsitektur serverless (Vercel/Render free tier).
4. **Proteksi & Keamanan Nginx Reverse Proxy**:
   - Dilengkapi SSL Let's Encrypt gratis dan sistem *Log Rotation* otomatis.

---

## 💻 1. Profil Alokasi Sumber Daya Server (8 GB RAM VPS)

| Parameter | Kapasitas Server Anda | Alokasi & Optimasi Sistem Isyaratku |
| :--- | :--- | :--- |
| **Sistem Operasi** | Ubuntu 22.04 / 24.04 LTS (64-bit) | Kompatibel penuh dengan Docker & Nginx |
| **RAM (8 GB)** | 8.192 MB | Backend dialokasikan batas aman hingga **6.000 MB RAM**, menyisakan >2 GB untuk OS & Nginx |
| **Swap Memory** | 4 GB Swap | Skrip otomatis membuat 4GB Swap untuk proteksi *zero-crash* |
| **Multi-Threading** | Auto CPU Cores | PyTorch mendeteksi jumlah core CPU VPS secara otomatis |
| **Log Rotation** | Auto Rotated | Maksimal `20MB x 5 file` untuk menjaga kebersihan storage |

---

## ⚡ 2. Panduan Cepat: Deployment 1-Klik dengan Docker

### Langkah 1: Akses Server VPS Anda via SSH
Buka terminal di komputer Anda:
```bash
ssh root@IP_SERVER_VPS_ANDA
# Masukkan password atau kunci SSH VPS Anda
```

---

### Langkah 2: Clone Repositori dari GitHub
```bash
# Pindah ke direktori /var/www (atau home)
cd /var/www || cd ~

# Clone repositori
git clone https://github.com/Vial30/isyaratku_bisindo.git

# Masuk ke direktori repositori
cd isyaratku_bisindo
```

---

### Langkah 3: Jalankan Skrip Instalasi Otomatis
```bash
sudo bash deploy/setup_vps.sh
```

**Apa saja yang dilakukan skrip otomatis ini?**
1. ✅ Mengupdate sistem paket Linux Ubuntu/Debian (`apt update`).
2. ✅ Mengalokasikan **4GB Swap RAM** untuk proteksi memori.
3. ✅ Menginstal **Docker Engine & Docker Compose**.
4. ✅ Mengonfigurasi Firewall UFW (Membuka port 22, 80, 443, dan 8000).
5. ✅ Membangun Docker Container backend (FastAPI, PyTorch, MediaPipe, OpenCV).
6. ✅ Menjalankan service Backend dan Reverse Proxy Nginx secara otomatis.

---

### Langkah 4: Verifikasi Server Aktif
Setelah instalasi selesai, buka di browser atau lakukan curl:
* **Health Check Status**: `http://IP_SERVER_VPS/api/health`
* **Swagger API Docs**: `http://IP_SERVER_VPS/docs`
* **WebSocket Endpoint**: `ws://IP_SERVER_VPS/v1/recognize` (atau port 8000: `ws://IP_SERVER_VPS:8000/v1/recognize`)

---

## 🔒 3. Menghubungkan Domain & Mengaktifkan SSL Gratis (`wss://` dan `https://`)

Kamera pada aplikasi Android dan browser modern membutuhkan protokol aman (**WSS** / **HTTPS**).

### Langkah A: Arahkan DNS Domain ke IP VPS
Masuk ke dashboard DNS domain Anda (Cloudflare, Niagahoster, Rumahweb, dll) dan buat DNS Record:
* **Type**: `A`
* **Name**: `api` (misalnya `api.namadomain.com`)
* **IPv4 Address**: `IP_SERVER_VPS_ANDA`
* **TTL**: Auto

---

### Langkah B: Dapatkan Sertifikat SSL Gratis (Certbot Let's Encrypt)
Jalankan perintah berikut di terminal VPS:
```bash
sudo certbot certonly --webroot -w /var/www/isyaratku_bisindo/nginx/certbot/www -d api.namadomain.com
```

---

### Langkah C: Aktifkan Blok HTTPS di Nginx
Edit file `nginx/conf.d/bisindo.conf`:
```bash
nano nginx/conf.d/bisindo.conf
```

Buka komentar (*uncomment*) pada bagian blok server HTTPS (Port 443) dan masukkan nama domain Anda:
```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.namadomain.com;

    ssl_certificate /etc/letsencrypt/live/api.namadomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.namadomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://backend_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 3600s;
        proxy_read_timeout 3600s;
        proxy_buffering off;
    }
}
```

Simpan file (`Ctrl + O` -> `Enter` -> `Ctrl + X`), lalu restart Nginx:
```bash
docker compose restart nginx
```

Sekarang endpoint WebSocket Anda aman: `wss://api.namadomain.com/v1/recognize`! 🎉

---

## 📱 4. Menghubungkan Aplikasi Android (APK)

1. Buka aplikasi **Isyaratku** di HP Android Anda.
2. Masuk ke tab **Pengaturan**.
3. Masukkan alamat server VPS Anda:
   * Dengan Domain/SSL: `wss://api.domain-anda.com/v1/recognize`
   * Dengan IP VPS: `ws://IP_SERVER_VPS:8000/v1/recognize`
4. Tekan **"Uji Latensi / Ping"** untuk memastikan respon server terhubung.
5. Tekan **"Simpan"**.
6. Masuk ke tab **Kamera**, dan aplikasi siap menerjemahkan secara instan!

---

## 🛠️ 5. Perintah Manajemen Server VPS

* **Melihat Log Real-Time Backend**:
  ```bash
  docker compose logs -f backend
  ```
* **Melihat Status Container**:
  ```bash
  docker compose ps
  ```
* **Me-restart Seluruh Service**:
  ```bash
  docker compose restart
  ```
* **Memperbarui Kode dari GitHub**:
  ```bash
  git pull origin main
  docker compose up -d --build
  ```
