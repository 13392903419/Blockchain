@echo off
chcp 65001
echo ========================================
echo 测试出勤记录查询功能
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
echo 测试环境已启动！
echo ========================================
echo Frontend: http://localhost:5173
echo Backend: http://localhost:4000
echo Blockchain: http://127.0.0.1:8545
echo ========================================
echo.
echo 测试步骤：
echo 1. 访问 http://localhost:5173
echo 2. 连接MetaMask钱包
echo 3. 点击登录按钮
echo 4. 测试出勤记录查询功能
echo 5. 测试课程管理功能
echo.
echo 请按任意键继续...
pause
