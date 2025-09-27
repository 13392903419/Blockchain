@echo off
echo ========================================
echo NFT Attendance DApp - 一键启动脚本
echo ========================================

echo.
echo 步骤 1: 启动区块链网络...
start "Hardhat Node" cmd /k "cd /d %~dp0blockchain && npx hardhat node"

echo 等待 3 秒让网络启动...
timeout /t 3 /nobreak > nul

echo.
echo 步骤 2: 部署智能合约...
cd /d %~dp0blockchain
npx hardhat run scripts/deploy.ts --network localhost
if %errorlevel% neq 0 (
    echo 合约部署失败！
    pause
    exit /b 1
)

echo.
echo 步骤 3: 启动后端服务器...
start "Backend Server" cmd /k "cd /d %~dp0backend && npm run dev"

echo 等待 2 秒让后端启动...
timeout /t 2 /nobreak > nul

echo.
echo 步骤 4: 启动前端应用...
start "Frontend App" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo 所有服务已启动！
echo ========================================
echo 前端应用: http://localhost:5173
echo 后端API: http://localhost:4000
echo 区块链网络: http://127.0.0.1:8545
echo ========================================
echo.
echo 请等待前端应用完全加载后访问 http://localhost:5173
echo.
pause
