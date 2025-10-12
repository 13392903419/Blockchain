@echo off
chcp 65001
echo ========================================
echo NFT Attendance DApp - Frontend Only
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
echo Step 3: Starting Frontend Application...
start "Frontend App" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo Frontend-only mode started!
echo ========================================
echo Frontend App: http://localhost:5173
echo Blockchain Network: http://127.0.0.1:8545
echo ========================================
echo.
echo Note: Backend API disabled - using localStorage for data
echo All features work without backend server!
echo.
echo Please wait for frontend app to fully load, then visit http://localhost:5173
echo.
pause
