@echo off
:: 统一编码为 UTF-8，避免中文乱码
chcp 65001 > nul
setlocal ENABLEEXTENSIONS
echo ========================================
echo 🚀 NFT Attendance DApp - 一键部署启动脚本
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
echo 步骤 2: 编译智能合约...
cd /d %~dp0blockchain
echo 开始编译合约...
call npx hardhat compile
echo 编译命令执行完毕，检查结果...
if %errorlevel% neq 0 (
    echo ❌ 合约编译失败！错误代码: %errorlevel%
    cd /d %~dp0
    pause
    exit /b 1
) else (
    echo ✅ 合约编译成功！
)
echo 合约编译完成。

echo.
echo 步骤 3: 部署智能合约...
echo 开始部署合约...
call npx hardhat run scripts/deploy.ts --network localhost 2>&1
if %errorlevel% neq 0 (
    echo ❌ 合约部署失败！错误代码: %errorlevel%
    cd /d %~dp0
    pause
    exit /b 1
) else (
    echo ✅ 合约部署成功！
)
echo 智能合约部署完成。

echo.
echo 步骤 4: 启动后端服务器...
start "Backend Server" cmd /k "chcp 65001>nul & cd /d %~dp0backend && npm run dev"
echo 后端服务器启动命令已发送。

echo 等待 2 秒让后端启动...
timeout /t 2 /nobreak > nul

echo.
echo 步骤 5: 启动前端应用...
start "Frontend App" cmd /k "chcp 65001>nul & cd /d %~dp0frontend && npm run dev"
echo 前端应用启动命令已发送。

echo 等待 3 秒让服务完全启动...
timeout /t 3 /nobreak > nul

echo.
echo ========================================
echo 🎉 区块链课程出勤系统部署完成！
echo ========================================
echo 前端应用: http://localhost:5173
echo 后端API: http://localhost:4000
echo 区块链网络: http://127.0.0.1:8545
echo ========================================
echo.
echo 📋 重要提醒：
echo 1. 请将生成的合约地址复制到配置文件中
echo 2. 如需添加更多教师，请运行：
echo    npx hardhat run scripts/grant-teacher.ts --network localhost 0x教师钱包地址
echo 3. 如需固定合约地址（开发环境），请先运行：
echo    .\restart-network.bat （重启Hardhat网络重置nonce）
echo 4. 详细说明请查看 CONTRACT_ADDRESS.md 文件
echo.
echo 请等待前端应用完全加载后访问 http://localhost:5173
echo.
pause
