@echo off
chcp 65001 > nul
echo ========================================
echo 🚀 GitHub 上传脚本 - NFT Attendance DApp
echo ========================================

cd /d %~dp0

echo 1. 初始化 Git 仓库...
if not exist ".git" (
    git init
    echo ✅ Git 仓库已初始化
) else (
    echo ℹ️ Git 仓库已存在
)

echo.
echo 2. 设置远程仓库...
git remote remove origin 2>nul
git remote add origin https://github.com/13392903419/Blockchain.git
echo ✅ 远程仓库已设置

echo.
echo 3. 添加文件到 Git...
git add .

echo.
echo 4. 检查状态...
git status --porcelain
if errorlevel 1 (
    echo ❌ Git 状态检查失败
    pause
    exit /b 1
)

echo.
echo 5. 提交更改...
git commit -m "NFT Attendance DApp - 区块链课程出勤系统

✨ 功能特性:
- 区块链原生角色管理
- NFT 出勤记录
- 教师/学生双角色界面
- 智能合约部署和交互
- 前后端分离架构

🛠️ 技术栈:
- 前端: React + TypeScript + Vite + Wagmi
- 后端: Node.js + Express + TypeScript
- 区块链: Solidity + Hardhat + ethers.js
- 数据库: MongoDB

📁 项目结构:
- frontend/: React 前端应用
- backend/: Express 后端 API
- blockchain/: 智能合约和部署脚本
- contracts/: Solidity 合约源码"

if %errorlevel% neq 0 (
    echo ❌ Git 提交失败
    pause
    exit /b 1
)

echo.
echo 6. 推送到 GitHub...
git branch -M main
git push -u origin main

if %errorlevel% neq 0 (
    echo ❌ Git 推送失败
    echo 请确保:
    echo 1. 已配置 Git 用户名和邮箱
    echo 2. 已生成 SSH 密钥并添加到 GitHub
    echo 3. 或使用 HTTPS 推送（需要输入用户名和密码令牌）
    pause
    exit /b 1
)

echo.
echo ========================================
echo 🎉 上传成功！
echo ========================================
echo 📋 项目已上传到:
echo https://github.com/13392903419/Blockchain.git
echo.
echo 🔧 下次更新代码时使用:
echo git add .
echo git commit -m "更新说明"
echo git push
echo.
pause
