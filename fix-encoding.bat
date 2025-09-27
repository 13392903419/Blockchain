@echo off
chcp 65001
echo 正在修复中文乱码问题...

echo 1. 检查Git状态...
git status --porcelain

echo.
echo 2. 尝试删除ter文件...
if exist ter (
    echo 找到ter文件，正在删除...
    del ter
    if %errorlevel% neq 0 (
        echo 无法删除ter文件，尝试强制删除...
        del /f /q ter
    )
) else (
    echo ter文件不存在
)

echo.
echo 3. 清理Git缓存...
git reset HEAD ter 2>nul
git rm --cached ter 2>nul

echo.
echo 4. 重新添加文件...
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
git add backend/package.json
git add backend/package-lock.json
git add backend/tsconfig.json
git add deploy-and-start.bat
git add fix-git.bat
git add fix-encoding.bat
git add todolist

echo.
echo 5. 提交更改...
git commit -m "Fix attendance status display and contract address issues

- Fix attendance status query function, now displays attended/not attended status correctly
- Fixed contract address to 0x5FbDB2315678afecb367f032d93F642f64180aa3
- Added contract existence check with clearer error messages
- Optimized UI display with visual feedback and status indicators
- Created one-click startup script deploy-and-start.bat
- Support batch minting and single minting functions

Function Status:
✅ Wallet connection normal
✅ Attendance status query normal
✅ Teacher batch minting normal
✅ Student check-in function normal
✅ Contract interaction normal"

if %errorlevel% neq 0 (
    echo Git commit failed!
    pause
    exit /b 1
)

echo.
echo ✅ Git issue fixed successfully!
echo.
git log --oneline -1
echo.
pause
