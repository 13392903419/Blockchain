@echo off
:: 重启Hardhat网络以获得固定合约地址
echo 🔄 重启Hardhat网络...
echo.

echo 终止现有Hardhat进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8545 ^| findstr LISTENING') do (
    echo 发现Hardhat进程 PID=%%a，正在结束...
    taskkill /PID %%a /F > nul 2>&1
)

echo 等待2秒...
timeout /t 2 /nobreak > nul

echo.
echo 🚀 启动新的Hardhat网络...
start "Hardhat Node" cmd /k "chcp 65001>nul & cd /d %~dp0blockchain && npx hardhat node"

echo.
echo ✅ 网络重启完成！
echo 现在可以运行部署脚本获得固定合约地址。
echo.
echo 运行部署: .\deploy-and-start.bat
echo.

pause
