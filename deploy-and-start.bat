@echo off
chcp 65001 > nul
setlocal ENABLEEXTENSIONS
echo ========================================
echo NFT Attendance DApp - Deployment Script
echo ========================================

echo.
echo Preprocessing: Checking port 8545...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8545 ^| findstr LISTENING') do (
    echo Found process using port 8545: PID %%a, terminating...
    taskkill /PID %%a /F > nul 2>&1
)
echo Port check completed.

echo.
echo Preprocessing: Checking port 4000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000 ^| findstr LISTENING') do (
    echo Found process using port 4000: PID %%a, terminating...
    taskkill /PID %%a /F > nul 2>&1
)
echo Port check completed.

echo.
echo Step 1: Starting blockchain network...
start "Hardhat Node" cmd /k "chcp 65001>nul & cd /d %~dp0blockchain && npx hardhat node"

echo Waiting 3 seconds for network to start...
timeout /t 3 /nobreak > nul

echo.
echo Step 2: Compiling smart contracts...
cd /d %~dp0blockchain
echo Starting contract compilation...
call npx hardhat compile
echo Compilation command completed, checking result...
if %errorlevel% neq 0 (
    echo Contract compilation failed! Error code: %errorlevel%
    cd /d %~dp0
    pause
    exit /b 1
) else (
    echo Contract compilation successful!
)
echo Contract compilation completed.

echo.
echo Step 3: Deploying smart contracts...
echo Starting contract deployment...
call npx hardhat run scripts/deploy.ts --network localhost
if %errorlevel% neq 0 (
    echo Contract deployment failed! Error code: %errorlevel%
    cd /d %~dp0
    pause
    exit /b 1
) else (
    echo Contract deployment successful!
)
echo Smart contract deployment completed.

echo.
echo Step 4: Setting up teacher roles...
echo Starting teacher role setup...
echo Extracting RoleManager contract address from deployment output...
set CONTRACT_ADDRESS=
for /f "delims=" %%i in ('findstr "RoleManager deployed to:" deploy_output.txt 2^>nul') do (
    for /f "tokens=4" %%a in ("%%i") do (
        set CONTRACT_ADDRESS=%%a
        goto :found_rolemanager
    )
)
:found_rolemanager
if not defined CONTRACT_ADDRESS (
    echo Could not find RoleManager address, using default
    set CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
    echo Using default address: %CONTRACT_ADDRESS%
) else (
    echo Using RoleManager address: %CONTRACT_ADDRESS%
)
call npx hardhat run scripts/setup-teachers.ts --network localhost
if %errorlevel% neq 0 (
    echo Teacher role setup failed! Error code: %errorlevel%
    cd /d %~dp0
    pause
    exit /b 1
) else (
    echo Teacher role setup successful!
)
echo Teacher role setup completed.

echo.
echo Step 5: Starting backend server...
start "Backend Server" cmd /k "chcp 65001>nul & cd /d %~dp0backend && npm run dev"
echo Backend server start command sent.

echo Waiting 2 seconds for backend to start...
timeout /t 2 /nobreak > nul

echo.
echo Step 6: Starting frontend application...
start "Frontend App" cmd /k "chcp 65001>nul & cd /d %~dp0frontend && npm run dev"
echo Frontend application start command sent.

echo Waiting 3 seconds for services to fully start...
timeout /t 3 /nobreak > nul

echo ========================================
echo Deployment completed successfully!
echo ========================================
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:4000
echo Blockchain network: http://127.0.0.1:8545
echo ========================================
echo.
echo Important notes:
echo 1. Teacher roles have been set on blockchain
echo 2. Please create environment files manually
echo 3. To add more teachers, run:
echo    npx hardhat run scripts/grant-teacher.ts --network localhost [teacher_address]
echo.
echo Please wait for the frontend to fully load, then visit http://localhost:5173
echo.
pause
