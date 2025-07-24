@echo off
echo 🎵 가족 음악 앱 - 간단한 웹 서버 실행
echo.
cd /d "C:\Users\aizim\OneDrive\Desktop\family-music-app\dist"
echo 📂 현재 폴더: %CD%
echo.
echo 🌐 웹 서버 시작 중... (포트 8000)
echo 브라우저에서 http://localhost:8000 으로 접속하세요
echo.
echo ⚠️  서버를 종료하려면 Ctrl+C를 누르세요
echo.

python -m http.server 8000

pause