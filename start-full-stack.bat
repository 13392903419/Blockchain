@echo off
chcp 65001
echo ========================================
echo NFT Attendance DApp - Full Stack Start
echo ========================================

echo.
echo Step 1: Starting Blockchain Network...
start "Hardhat Node" cmd /k "cd /d %~dp0blockchain && npx hardhat node"

echo Waiting 3 seconds for network to start...
timeout /t 3 /nobreak > nul

echo.
echo Step 2: Deploying Smart Contract...
cd /d %~dp0blockchain
npx hardhat run scripts/deploy.ts --network localhost
if %errorlevel% neq 0 (
    echo Contract deployment failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Starting Backend Server...
start "Backend Server" cmd /k "cd /d %~dp0backend && npm run dev"

echo Waiting 2 seconds for backend to start...
timeout /t 2 /nobreak > nul

echo.
echo Step 4: Starting Frontend Application...
start "Frontend App" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo Full stack application started!
echo ========================================
echo Frontend App: http://localhost:5173
echo Backend API: http://localhost:4000
echo Blockchain Network: http://127.0.0.1:8545
echo ========================================
echo.
echo Please wait for all services to fully load:
echo 1. Blockchain network will show accounts
echo 2. Backend will show "API listening on http://localhost:4000"
echo 3. Frontend will show "Local: http://localhost:5173"
echo.
echo Then visit http://localhost:5173 to use the application
echo.
pause
