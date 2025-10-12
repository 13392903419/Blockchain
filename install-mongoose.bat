@echo off
chcp 65001
echo Installing mongoose...
cd backend
npm install mongoose
echo.
echo Installation complete!
echo.
echo Next steps:
echo 1. Create backend/.env file with your Atlas connection string
echo 2. Run start-with-database.bat to test
pause
