@echo off
chcp 65001 >nul 2>&1
setlocal ENABLEEXTENSIONS
echo ========================================
echo NFT Attendance DApp - Deployment Script
echo ========================================

echo.
echo Preprocessing: Checking port 8545...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8545 ^| findstr LISTENING') do (
    echo Found process using port 8545: PID %%a, terminating...
    taskkill /PID %%a /F >nul 2>&1
)
echo Port check completed.

echo.
echo Preprocessing: Checking port 4000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000 ^| findstr LISTENING') do (
    echo Found process using port 4000: PID %%a, terminating...
    taskkill /PID %%a /F >nul 2>&1
)
echo Port check completed.

echo.
echo Step 1: Starting blockchain network...
start "Hardhat Node" cmd /k "chcp 65001>nul & cd /d %~dp0blockchain && npx hardhat node"

echo Waiting 3 seconds for network to start...
timeout /t 3 /nobreak >nul

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
echo Starting contract deployment (including StudentPetNFT)...
call npx hardhat run scripts/deploy_advanced.ts --network localhost > deploy_output.txt 2>&1
if %errorlevel% neq 0 (
    echo Contract deployment failed! Error code: %errorlevel%
    type deploy_output.txt
    cd /d %~dp0
    pause
    exit /b 1
) else (
    echo Contract deployment successful!
    type deploy_output.txt
)
echo Smart contract deployment completed.

echo.
echo Step 4: Extracting contract addresses from deployment output...
echo Extracting RoleManager contract address...
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

echo Extracting StudentPetNFT contract address...
set STUDENT_PET_CONTRACT_ADDRESS=
for /f "delims=" %%i in ('findstr "StudentPetNFT deployed to:" deploy_output.txt 2^>nul') do (
    for /f "tokens=4" %%a in ("%%i") do (
        set STUDENT_PET_CONTRACT_ADDRESS=%%a
        goto :found_studentpet
    )
)
:found_studentpet
if not defined STUDENT_PET_CONTRACT_ADDRESS (
    echo Warning: Could not find StudentPetNFT address from deployment output
    echo Please check deploy_output.txt manually
) else (
    echo Using StudentPetNFT address: %STUDENT_PET_CONTRACT_ADDRESS%
)

echo.
echo Step 5: Setting up teacher roles...
echo Starting teacher role setup...
set CONTRACT_ADDRESS=%CONTRACT_ADDRESS%
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
echo Step 6: Creating/updating backend .env file...
echo Checking if backend/.env exists...
if not exist "%~dp0backend\.env" (
    echo Creating backend/.env file...
    (
        echo # Database configuration
        echo MONGODB_URI=mongodb://localhost:27017/nft_attendance
        echo.
        echo # JWT Secret
        echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
        echo.
        echo # Blockchain Contract Addresses
        echo CONTRACT_ADDRESS=%CONTRACT_ADDRESS%
        if defined STUDENT_PET_CONTRACT_ADDRESS (
            echo STUDENT_PET_CONTRACT_ADDRESS=%STUDENT_PET_CONTRACT_ADDRESS%
        )
        echo.
        echo # Blockchain RPC and Private Key
        echo RPC_URL=http://127.0.0.1:8545
        echo OWNER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
        echo.
        echo # Development settings
        echo NODE_ENV=development
        echo PORT=4000
    ) > "%~dp0backend\.env"
    echo Created backend/.env file with contract addresses
) else (
    echo backend/.env already exists, updating contract addresses...
    echo.
    echo Warning: Please manually update backend/.env with:
    echo    CONTRACT_ADDRESS=%CONTRACT_ADDRESS%
    if defined STUDENT_PET_CONTRACT_ADDRESS (
        echo    STUDENT_PET_CONTRACT_ADDRESS=%STUDENT_PET_CONTRACT_ADDRESS%
    )
)

echo.
echo Step 7: Starting backend server...
start "Backend Server" cmd /k "chcp 65001>nul & cd /d %~dp0backend && npm run dev"
echo Backend server start command sent.

echo Waiting 2 seconds for backend to start...
timeout /t 2 /nobreak >nul

echo.
echo Step 8: Starting frontend application...
start "Frontend App" cmd /k "chcp 65001>nul & cd /d %~dp0frontend && npm run dev"
echo Frontend application start command sent.

echo Waiting 3 seconds for services to fully start...
timeout /t 3 /nobreak >nul

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
echo 2. Contract addresses have been extracted and saved
if defined STUDENT_PET_CONTRACT_ADDRESS (
    echo 3. StudentPetNFT contract deployed: %STUDENT_PET_CONTRACT_ADDRESS%
    echo    Pet system is fully decentralized!
) else (
    echo 3. Warning: StudentPetNFT address not found - check deploy_output.txt
)
echo 4. To add more teachers, run:
echo    npx hardhat run scripts/setup-teachers.ts --network localhost
echo.
echo Contract Addresses:
echo   RoleManager: %CONTRACT_ADDRESS%
if defined STUDENT_PET_CONTRACT_ADDRESS (
    echo   StudentPetNFT: %STUDENT_PET_CONTRACT_ADDRESS%
)
echo.
echo Please wait for the frontend to fully load, then visit http://localhost:5173
echo.
pause
