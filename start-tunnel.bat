@echo off
if not exist "cloudflared.exe" (
    echo Downloading cloudflared...
    powershell -Command "Invoke-WebRequest -Uri https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -OutFile cloudflared.exe"
)

echo Starting Cloudflare Tunnel for http://localhost:5173...
cloudflared.exe tunnel --url http://127.0.0.1:5173
pause
