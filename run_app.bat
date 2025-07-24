@echo off
echo 🎵 가족 음악 앱 실행 중...
cd /d "C:\Users\aizim\OneDrive\Desktop\family-music-app"
echo.
echo 선택하세요:
echo [1] 개발 모드 (코드 수정 가능)
echo [2] 빌드된 앱 실행
echo.
set /p choice="번호를 입력하세요 (1 또는 2): "

if "%choice%"=="1" (
    echo.
    echo 🚀 개발 서버 시작 중...
    npm run dev
) else if "%choice%"=="2" (
    echo.
    echo 📦 빌드된 앱 실행 중...
    npm run preview
) else (
    echo 잘못된 선택입니다.
    pause
    goto :EOF
)

pause