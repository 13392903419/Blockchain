@echo off
:: 统一编码为 UTF-8，避免中文乱码
chcp 65001 > nul
setlocal ENABLEEXTENSIONS
echo ========================================
echo NFT Attendance DApp - 一键启动脚本
echo ========================================

echo.
echo 预处理: 检测 8545 端口占用并尝试释放...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8545 ^| findstr LISTENING') do (
    echo 发现占用 8545 的进程 PID=%%a ，正在结束...
    taskkill /PID %%a /F > nul 2>&1
)
echo 端口检查完成。
echo.

echo.
echo 预处理: 检测 4000 端口占用并尝试释放...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000 ^| findstr LISTENING') do (
    echo 发现占用 4000 的进程 PID=%%a ，正在结束...
    taskkill /PID %%a /F > nul 2>&1
)
echo 端口检查完成。
echo.

echo 步骤 1: 启动区块链网络...
start "Hardhat Node" cmd /k "chcp 65001>nul & cd /d %~dp0blockchain && npx hardhat node"

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
start "Backend Server" cmd /k "chcp 65001>nul & cd /d %~dp0backend && npm run dev"

echo 等待 2 秒让后端启动...
timeout /t 2 /nobreak > nul

echo.
echo 步骤 4: 启动前端应用...
start "Frontend App" cmd /k "chcp 65001>nul & cd /d %~dp0frontend && npm run dev"

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
