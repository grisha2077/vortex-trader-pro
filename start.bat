@echo off
setlocal

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if keys.env exists
if not exist keys.env (
    echo Please create a keys.env file with your Binance API keys:
    echo BINANCE_API_KEY=your_api_key
    echo BINANCE_API_SECRET=your_api_secret
    pause
    exit /b 1
)

REM Copy keys.env to .env if it doesn't exist
if not exist .env (
    copy keys.env .env
)

REM Check if node_modules exists and package.json is present
if not exist node_modules (
    if exist package.json (
        echo Installing dependencies...
        call npm install
        if %ERRORLEVEL% neq 0 (
            echo Failed to install dependencies
            pause
            exit /b 1
        )
    ) else (
        echo package.json not found
        pause
        exit /b 1
    )
)

REM Build React app if build folder doesn't exist
if not exist build (
    echo Building React app...
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo Failed to build React app
        pause
        exit /b 1
    )
)

REM Start the server in the background
start /B node src/server-entry.js %*

REM Wait for the server to start
timeout /t 5 /nobreak >nul

REM Open the web interface in the default browser
start http://localhost:3000

REM Keep the window open to display any errors
:loop
timeout /t 1 /nobreak >nul
tasklist | find "node.exe" >nul
if %ERRORLEVEL% equ 0 goto loop

echo Server stopped
pause 