@echo off
echo 正在安全保存当前版本到Git...

echo 跳过有问题的文件，只添加核心文件...
git add frontend/src/
git add backend/src/
git add blockchain/contracts/
git add blockchain/scripts/
git add blockchain/hardhat.config.ts
git add blockchain/package.json
git add blockchain/package-lock.json
git add blockchain/tsconfig.json
git add frontend/package.json
git add frontend/package-lock.json
git add frontend/vite.config.ts
git add frontend/tsconfig*.json
git add frontend/index.html
git add frontend/src/
git add backend/package.json
git add backend/package-lock.json
git add backend/tsconfig.json
git add deploy-and-start.bat
git add todolist

echo 提交更改...
git commit -m "✅ 修复出勤状态显示和合约地址问题

- 修复出勤状态查询功能，现在可以正常显示已出勤/未出勤状态
- 固定合约地址为 0x5FbDB2315678afecb367f032d93F642f64180aa3
- 添加合约存在性检查，提供更清晰的错误提示
- 优化UI显示，增加视觉反馈和状态指示
- 创建一键启动脚本 deploy-and-start.bat
- 支持批量铸造和单个铸造功能

功能状态：
✅ 钱包连接正常
✅ 出勤状态查询正常  
✅ 教师批量铸造正常
✅ 学生签到功能正常
✅ 合约交互正常"

if %errorlevel% neq 0 (
    echo Git commit 失败！
    pause
    exit /b 1
)

echo.
echo ✅ 版本保存成功！
echo.
git log --oneline -1
echo.
pause
