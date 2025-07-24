@echo off
echo 🎵 가족 음악 앱 - Node.js 서버 실행
echo.
cd /d "C:\Users\aizim\OneDrive\Desktop\family-music-app\dist"
echo 📂 현재 폴더: %CD%
echo.
echo 🌐 Node.js 서버 시작 중... (포트 3000)
echo 브라우저에서 http://localhost:3000 으로 접속하세요
echo.
echo ⚠️  서버를 종료하려면 Ctrl+C를 누르세요
echo.

npx serve -s . -l 3000

pause