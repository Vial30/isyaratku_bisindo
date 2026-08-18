# 🚀 Panduan Lengkap Deployment Isyaratku BISINDO ke IDCloudHost

Panduan resmi langkah-demi-langkah untuk melakukan *deploy* backend server **Isyaratku BISINDO** (FastAPI + PyTorch + MediaPipe + WebSocket Real-Time) ke **IDCloudHost** (Cloud VPS / App Cloud).

---

## 📌 Mengapa Menggunakan IDCloudHost?

1. **Datacenter Lokal (Jakarta, Indonesia)**: Menghasilkan latensi jaringan ultra-rendah (**~10–25 ms** dari seluruh Indonesia), sangat krusial untuk inferensi video *real-time* 16-frame.
2. **Dukungan Penuh WebSocket (`ws://` & `wss://`)**: Tidak ada batasan durasi koneksi seperti layanan serverless (Vercel/Netlify).
3. **Akses Root & Fleksibilitas Docker**: Memungkinkan instalasi dependensi OpenCV, MediaPipe Landmarkers, dan akselerasi PyTorch secara penuh.
4. **Biaya Efisien**: Tagihan dalam mata uang Rupiah (IDR) dengan sistem per jam atau bulanan yang ramah kantong.

---

## 💻 1. Rekomendasi Spesifikasi Server (IDCloudHost Cloud VPS)

| Komponen | Spesifikasi Minimal | Spesifikasi Direkomendasikan |
| :--- | :--- | :--- |
| **Sistem Operasi** | Ubuntu 22.04 LTS / 24.04 LTS | Ubuntu 22.04 / 24.04 LTS 64-bit |
| **vCPU** | 1 Core | **2 Cores** (Dual Core) |
| **RAM** | 2 GB | **4 GB** (Disarankan untuk MediaPipe + PyTorch) |
| **Storage** | 20 GB SSD | **30 GB+ NVMe SSD** |
| **Lokasi** | Datacenter Jakarta / Indonesia | Datacenter Jakarta / Indonesia |

---

## ⚡ 2. Cara Cepat: Deployment 1-Klik dengan Docker (Paling Direkomendasikan)

### Langkah 1: Akses Server VPS Anda via SSH
Buka terminal (PowerShell, Command Prompt, atau Terminal Mac/Linux):
```bash
ssh root@IP_SERVER_IDCLOUDHOST
# Masukkan password VPS Anda
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
Jalankan skrip `setup_idcloudhost.sh` yang sudah disediakan:
```bash
sudo bash deploy/setup_idcloudhost.sh
```

**Apa saja yang dilakukan skrip otomatis ini?**
1. ✅ Memperbarui paket Linux Ubuntu (`apt-get update`).
2. ✅ Menginstal Docker & Docker Compose Plugin.
3. ✅ Mengonfigurasi Firewall UFW (Membuka port 22, 80, 443, dan 8000).
4. ✅ Membangun *Docker Image* backend (FastAPI, PyTorch, MediaPipe, OpenCV).
5. ✅ Menjalankan service Backend dan Reverse Proxy Nginx secara otomatis.

---

### Langkah 4: Verifikasi Server Aktif
Setelah instalasi selesai, uji server melalui browser atau curl:
* **Health Check**: `http://IP_SERVER_ANDA/api/health`
* **Swagger API Docs**: `http://IP_SERVER_ANDA/docs`
* **WebSocket Endpoint**: `ws://IP_SERVER_ANDA/v1/recognize`

---

## 🔒 3. Menghubungkan Domain & Mengaktifkan SSL Gratis (`wss://` dan `https://`)

Kamera pada aplikasi mobile atau browser web modern membutuhkan protokol aman (**WSS** / **HTTPS**).

### Langkah A: Arahkan DNS Domain ke IP IDCloudHost
Masuk ke panel DNS penyedia domain Anda (Cloudflare, IDCloudHost, Niagahoster, dll) dan buat DNS Record:
* **Type**: `A`
* **Name**: `api` (atau subdomain yang diinginkan, misal `api.namadomain.com`)
* **IPv4 Address**: `IP_SERVER_IDCLOUDHOST_ANDA`
* **TTL**: Auto / 1 menit

---

### Langkah B: Dapatkan Sertifikat SSL Gratis (Let's Encrypt Certbot)
Jalankan perintah berikut di terminal server VPS Anda:
```bash
sudo certbot certonly --webroot -w /var/www/isyaratku_bisindo/nginx/certbot/www -d api.namadomain.com
```

---

### Langkah C: Aktifkan SSL di Nginx
Edit file `nginx/conf.d/bisindo.conf`:
```bash
nano nginx/conf.d/bisindo.conf
```

Buka komentar (*uncomment*) pada bagian blok server HTTPS (Port 443) dan sesuaikan nama domain:
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

Simpan file (`Ctrl + O` lalu `Enter`, lalu `Ctrl + X`), kemudian restart Nginx:
```bash
docker compose restart nginx
```

Sekarang endpoint WebSocket Anda aman: `wss://api.namadomain.com/v1/recognize`! 🎉

---

## 📱 4. Menghubungkan Aplikasi Mobile (Expo Frontend)

1. Buka aplikasi **Isyaratku** di HP Anda.
2. Masuk ke tab **Pengaturan** (ikon gear di pojok kanan bawah).
3. Pada kolom **Server WebSocket URL**, masukkan:
   * Jika menggunakan domain SSL: `wss://api.namadomain.com/v1/recognize`
   * Jika menggunakan IP langsung: `ws://IP_SERVER_IDCLOUDHOST:8000/v1/recognize`
4. Tekan tombol **"Tes Koneksi"** untuk memastikan latensi terdeteksi (biasanya 15-30ms).
5. Tekan **"Simpan Pengaturan"**.
6. Kembali ke tab **Kamera**, dan aplikasi siap menerjemahkan secara real-time!

---

## 🔄 5. Otomasi CI/CD via GitHub Actions (Auto-Deploy)

Setiap kali Anda melakukan `git push origin main`, GitHub Actions dapat mengupdate server IDCloudHost secara otomatis:

1. Buka repositori GitHub Anda di browser -> klik tab **Settings** -> **Secrets and variables** -> **Actions**.
2. Klik **New repository secret** dan tambahkan:
   * `IDCLOUDHOST_HOST`: IP publik VPS IDCloudHost Anda.
   * `IDCLOUDHOST_USER`: Username SSH (biasanya `root`).
   * `IDCLOUDHOST_SSH_KEY`: Private SSH Key Anda (isi dari `~/.ssh/id_rsa`).
   * `IDCLOUDHOST_PORT`: Port SSH (biasanya `22`).

---

## 🛠️ 6. Perintah Maintenance & Troubleshooting

### Melihat Log Real-Time Backend
```bash
docker compose logs -f backend
```

### Memeriksa Status Container
```bash
docker compose ps
```

### Me-restart Seluruh Service
```bash
docker compose restart
```

### Memperbarui Kode Secara Manual
```bash
git pull origin main
docker compose up -d --build
```

### Mengatasi Port 80 / 8000 Bentrok
Jika ada service apache/nginx bawaan OS yang aktif:
```bash
sudo systemctl stop apache2 2>/dev/null || true
sudo systemctl disable apache2 2>/dev/null || true
```
