@echo off
chcp 65001
echo ========================================
echo NFT Attendance DApp - Full Stack with Database
echo ========================================

echo.
echo Step 1: Starting MongoDB Database...
echo Note: Please make sure MongoDB is installed and running
echo.
echo MongoDB Installation Guide:
echo 1. Download MongoDB Community Edition 6.0.x from:
echo    https://www.mongodb.com/try/download/community
echo 2. Install and start MongoDB service
echo 3. Or use MongoDB Atlas (cloud database) - FREE tier available
echo.
echo Alternative: Use MongoDB Atlas (Cloud) - Recommended for beginners
echo 1. Go to https://cloud.mongodb.com
echo 2. Create free account and cluster
echo 3. Get connection string and update MONGODB_URI in backend/.env
echo.

echo Step 2: Starting Blockchain Network...
start "Hardhat Node" cmd /k "cd /d %~dp0blockchain && npx hardhat node"

echo Waiting 3 seconds for network to start...
timeout /t 3 /nobreak > nul

echo.
echo Step 3: Deploying Smart Contract...
cd /d %~dp0blockchain
npx hardhat run scripts/deploy.ts --network localhost
if %errorlevel% neq 0 (
    echo Contract deployment failed!
    pause
    exit /b 1
)

echo.
echo Step 4: Starting Backend Server (with MongoDB)...
start "Backend Server" cmd /k "cd /d %~dp0backend && npm run dev"

echo Waiting 3 seconds for backend to connect to database...
timeout /t 3 /nobreak > nul

echo.
echo Step 5: Starting Frontend Application...
start "Frontend App" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo Full stack application with database started!
echo ========================================
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:4000
echo Blockchain: http://127.0.0.1:8545
echo Database: MongoDB (localhost:27017)
echo ========================================
echo.
echo Please ensure MongoDB is running before starting the backend.
echo If you don't have MongoDB installed, you can:
echo 1. Install MongoDB Community Edition
echo 2. Or use MongoDB Atlas (cloud database)
echo 3. Or modify MONGODB_URI in backend/.env
echo.
echo Wait for all services to load, then visit http://localhost:5173
echo.
pause
