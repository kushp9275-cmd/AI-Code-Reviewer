@echo off
echo ===================================================
echo   Starting Secure AI Code Reviewer Backend...
echo ===================================================

:: Check if virtual environment exists
if not exist .venv (
    echo [ERROR] Virtual environment not found. Creating virtual environment and installing dependencies...
    uv venv
    if errorlevel 1 (
        echo Failed to create virtual environment with uv. Make sure uv is installed.
        pause
        exit /b 1
    )
    call .venv\Scripts\activate
    uv pip install -r requirements.txt
    if errorlevel 1 (
        echo Failed to install dependencies.
        pause
        exit /b 1
    )
) else (
    call .venv\Scripts\activate
)

:: Check if .env file exists, create if not
if not exist .env (
    echo GEMINI_API_KEY= > .env
)

:: Check if .env has a defined GEMINI_API_KEY (excluding blank keys)
findstr /R "^GEMINI_API_KEY=." .env >nul
if errorlevel 1 (
    echo.
    echo ============================================================
    echo   [WARNING] GEMINI_API_KEY is not configured in .env!
    echo ============================================================
    echo To use this tool, you need a free Google Gemini API Key.
    echo 1. Get a free key from: https://aistudio.google.com/
    echo 2. Set it up using the PowerShell command below:
    echo.
    echo powershell -Command "$val = Read-Host -Prompt 'Enter GEMINI_API_KEY' -AsSecureString; $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($val); $UnsecureVal = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR); Clear-Content -Path '.env'; Add-Content -Path '.env' -Value \"GEMINI_API_KEY=$UnsecureVal\"; Write-Host 'Key saved to .env!'"
    echo.
    echo ============================================================
    echo.
)

echo Starting FastAPI server...
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
pause
