#!/usr/bin/env bash
# ==============================================================================
# 🚀 SKRIP OTOMATISASI DEPLOYMENT ISYARATKU BISINDO DI IDCLOUDHOST (UBUNTU VPS)
# ==============================================================================

set -e

echo ""
echo "=================================================================="
echo "🤟 ISYARATKU BISINDO - IDCLOUDHOST VPS AUTOMATED SETUP SCRIPT"
echo "=================================================================="
echo ""

# 1. Pastikan script dijalankan sebagai root atau dengan sudo
if [ "$EUID" -ne 0 ]; then
  echo "❌ Mohon jalankan skrip ini dengan hak akses root atau sudo:"
  echo "   sudo bash deploy/setup_idcloudhost.sh"
  exit 1
fi

echo "📦 [1/6] Mengupdate paket sistem Ubuntu..."
apt-get update -y && apt-get upgrade -y

echo "🔧 [2/6] Menginstal dependensi dasar (Git, Curl, UFW, Certbot)..."
apt-get install -y git curl ufw apt-transport-https ca-certificates gnupg lsb-release certbot python3-certbot-nginx

# 3. Instalasi Docker & Docker Compose jika belum terpasang
if ! command -v docker &> /dev/null; then
    echo "🐳 [3/6] Menginstal Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
else
    echo "✅ [3/6] Docker sudah terinstal."
fi

# Pastikan Docker Compose plugin terinstal
if ! docker compose version &> /dev/null; then
    echo "🐳 Menginstal Docker Compose Plugin..."
    apt-get install -y docker-compose-plugin
fi

# 4. Konfigurasi Firewall UFW
echo "🛡️  [4/6] Mengonfigurasi Firewall (UFW)..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw --force enable

# 5. Persiapan Direktori SSL Certbot
echo "📁 [5/6] Menyiapkan direktori Nginx & Certbot..."
mkdir -p nginx/certbot/conf
mkdir -p nginx/certbot/www

# 6. Build dan Jalankan Docker Containers
echo "🚀 [6/6] Membangun dan menjalankan Docker Containers..."
docker compose down || true
docker compose build --no-cache
docker compose up -d

echo ""
echo "=================================================================="
echo "🎉 DEPLOYMENT BERHASIL DI SERVER IDCLOUDHOST!"
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
