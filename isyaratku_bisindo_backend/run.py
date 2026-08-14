"""
Runner script for Isyaratku BISINDO Backend.
Usage:
    python run.py
"""
import socket
import uvicorn
from app.config import HOST, PORT, DEBUG

def get_local_ip():
    """Detects the primary LAN IPv4 address of this machine."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    local_ip = get_local_ip()
    
    print("\n" + "=" * 65)
    print("🚀 ISYARATKU BISINDO BACKEND SERVER AKTIF")
    print("=" * 65)
    print(f"📱 URL WebSocket untuk HP (Mobile): ws://{local_ip}:{PORT}/v1/recognize")
    print(f"💻 URL WebSocket untuk Laptop (Web): ws://localhost:{PORT}/v1/recognize")
    print(f"🌐 REST API Swagger Docs         : http://{local_ip}:{PORT}/docs")
    print("=" * 65 + "\n")
    
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=DEBUG,
        log_level="info"
    )
