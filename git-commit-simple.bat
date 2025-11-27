@echo off
chcp 65001
echo Fixing Git commit issue...

echo 1. Adding files to Git...
git add frontend/src/
git add backend/src/
git add blockchain/contracts/
git add blockchain/scripts/
git add blockchain/hardhat.config.ts
git add blockchain/package.json
git add blockchain/package-lock.json
git add blockchain/tsconfig.json
git add frontend/package.json
git add frontend/package-lock.json
git add frontend/vite.config.ts
git add frontend/tsconfig*.json
git add frontend/index.html
git add backend/package.json
git add backend/package-lock.json
git add backend/tsconfig.json
git add deploy-and-start.bat
git add start-english.bat
git add fix-encoding.bat
git add todolist

echo.
echo 2. Committing changes...
git commit -m "finish...delete the attendance function for students"

if %errorlevel% neq 0 (
    echo Git commit failed!
    pause
    exit /b 1
)

echo.
echo ✅ Git commit successful!
echo.
git log --oneline -1
echo.
pause
