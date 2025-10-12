@echo off
chcp 65001
echo ========================================
echo 测试数据库集成功能
echo ========================================

echo.
echo Step 1: 检查后端服务器状态...
echo Testing backend health endpoint...

REM 使用curl测试后端健康检查
curl -s http://localhost:4000/health > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend server is running
) else (
    echo ❌ Backend server is not running
    echo Please start the backend server first
    echo Run: cd backend && npm run dev
    pause
    exit /b 1
)

echo.
echo Step 2: 测试认证API...
echo Testing authentication endpoints...

REM 测试挑战获取
curl -s http://localhost:4000/auth/challenge -w "%%{http_code}" > temp_response.txt 2>&1
set /p response_code=<temp_response.txt
if "%response_code%"=="200" (
    echo ✅ Challenge endpoint working
) else (
    echo ❌ Challenge endpoint failed
)

echo.
echo Step 3: 测试课程API...
echo Testing course management...

REM 测试获取课程
curl -s -H "Content-Type: application/json" http://localhost:4000/api/courses -w "%%{http_code}" > temp_response.txt 2>&1
set /p response_code=<temp_response.txt
if "%response_code%"=="200" (
    echo ✅ Courses API working
) else (
    echo ❌ Courses API failed
)

echo.
echo Step 4: 测试出勤记录API...
echo Testing attendance records...

REM 测试获取出勤记录
curl -s http://localhost:4000/api/attendance/records -w "%%{http_code}" > temp_response.txt 2>&1
set /p response_code=<temp_response.txt
if "%response_code%"=="200" (
    echo ✅ Attendance records API working
) else (
    echo ❌ Attendance records API failed
)

echo.
echo ========================================
echo 数据库集成测试完成！
echo ========================================
echo.
echo 如果所有测试都通过 (显示 ✅)，说明：
echo - 后端服务器运行正常
echo - 数据库连接正常
echo - 所有API接口工作正常
echo - 可以正常使用完整功能
echo.
echo 如果有失败的项目，请检查：
echo 1. MongoDB 是否安装并运行
echo 2. 后端服务器是否启动
echo 3. 网络连接是否正常
echo.
del temp_response.txt 2>nul
pause
