#!/usr/bin/env bash
# ==============================================================================
# 🚀 SKRIP OTOMATISASI DEPLOYMENT ISYARATKU BISINDO DI IDCLOUDHOST
# Disesuaikan Khusus untuk Spesifikasi Basic: 2 vCPU | 2 GB RAM | 20 GB Storage
# ==============================================================================

set -e

echo ""
echo "=================================================================="
echo "🤟 ISYARATKU BISINDO - IDCLOUDHOST SETUP (2 Core / 2GB RAM / 20GB)"
echo "=================================================================="
echo ""

# 1. Pastikan script dijalankan sebagai root atau dengan sudo
if [ "$EUID" -ne 0 ]; then
  echo "❌ Mohon jalankan skrip ini dengan hak akses root atau sudo:"
  echo "   sudo bash deploy/setup_idcloudhost.sh"
  exit 1
fi

echo "📦 [1/7] Mengupdate paket sistem Ubuntu..."
apt-get update -y && apt-get upgrade -y

echo "🔧 [2/7] Menginstal dependensi sistem (Git, Curl, UFW, Certbot)..."
apt-get install -y git curl ufw apt-transport-https ca-certificates gnupg lsb-release certbot python3-certbot-nginx

# 2.5. ALOKASI SWAP MEMORY 2GB (Sangat Penting untuk VPS 2GB RAM agar Bebas Crash OOM)
echo "💾 [3/7] Memeriksa & Mengalokasikan 2GB SWAP RAM..."
if [ ! -f /swapfile ] && [ $(free -m | awk '/^Swap:/ {print $2}') -lt 1000 ]; then
    echo "⚙️  Membuat 2GB Swapfile untuk stabilitas memori..."
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    sysctl vm.swappiness=10
    if ! grep -q 'vm.swappiness' /etc/sysctl.conf; then
        echo 'vm.swappiness=10' >> /etc/sysctl.conf
    fi
    echo "✅ Swap memory 2GB berhasil diaktifkan!"
else
    echo "✅ Swap memory sudah tersedia."
fi

# 3. Instalasi Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "🐳 [4/7] Menginstal Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
else
    echo "✅ [4/7] Docker sudah terinstal."
fi

# Pastikan Docker Compose plugin terinstal
if ! docker compose version &> /dev/null; then
    echo "🐳 Menginstal Docker Compose Plugin..."
    apt-get install -y docker-compose-plugin
fi

# 4. Konfigurasi Firewall UFW
echo "🛡️  [5/7] Mengonfigurasi Firewall UFW (Buka port 22, 80, 443, 8000)..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw --force enable

# 5. Persiapan Direktori SSL Certbot
echo "📁 [6/7] Menyiapkan direktori Nginx & Certbot..."
mkdir -p nginx/certbot/conf
mkdir -p nginx/certbot/www

# 6. Build dan Jalankan Docker Containers (Optimasi Storage 20GB)
echo "🚀 [7/7] Membangun dan menjalankan Docker Containers (Lightweight CPU Build)..."
docker compose down || true
docker compose build --no-cache
docker compose up -d

# Bersihkan layer build sementara agar hemat storage 20GB
docker image prune -f || true

echo ""
echo "=================================================================="
echo "🎉 DEPLOYMENT BERHASIL DI SERVER IDCLOUDHOST (2 Core / 2GB / 20GB)!"
echo "=================================================================="
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
echo "📍 IP Publik Server       : ${SERVER_IP}"
echo "🌐 REST API Status        : http://${SERVER_IP}/api/health"
echo "📚 Swagger Documentation  : http://${SERVER_IP}/docs"
echo "📱 WebSocket Endpoint     : ws://${SERVER_IP}/v1/recognize (Port 80 via Nginx)"
echo "⚡ Direct WebSocket       : ws://${SERVER_IP}:8000/v1/recognize"
echo "=================================================================="
echo ""
echo "💡 TIPS AKTIVASI DOMAIN & SSL GRATIS (HTTPS/WSS):"
echo "1. Arahkan DNS Domain (A Record) ke IP: ${SERVER_IP}"
echo "2. Jalankan certbot: certbot certonly --webroot -w ./nginx/certbot/www -d yourdomain.com"
echo "3. Aktifkan blok HTTPS di nginx/conf.d/bisindo.conf lalu jalankan: docker compose restart nginx"
echo ""
