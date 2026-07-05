# Secure AI-Driven Code Reviewer (SAST Dashboard)

A modern, fast, and secure Static Application Security Testing (SAST) tool and code reviewer. The application allows developers to submit or upload source code files, parses the code, and utilizes Google Gemini (via Google AI Studio Free Tier) to scan for security vulnerabilities (OWASP Top 10), logical bugs, and performance bottlenecks, returning a structured remediation report.

---

## Features

- **Wide Format Support**: Automatically detects and scans Python, JavaScript, TypeScript, HTML, CSS, C/C++, C#, Java, Kotlin, Swift, Go, Rust, Ruby, PHP, Shell/Powershell scripts, JSON, YAML, TOML, and XML.
- **AI Vulnerability Auditor**: Integrates Gemini 2.5 Flash as a *Principal Application Security Engineer*.
- **Structured Audit Report**: Visualized metrics (High, Medium, Low severity issues) and high-fidelity health summary.
- **Interactive Code Remediator**: Shows a side-by-side or split diff comparison of vulnerable code vs. secure remediated code with one-click copy support.
- **Drag-and-Drop Dropzone**: Simple and responsive drag-and-drop file operations.
- **Zero Cost Execution**: Operates completely under the Google AI Studio free tier.

---

## Project Structure

```text
AI Code Reviewer/
├── backend/
│   ├── __init__.py
│   ├── main.py        # FastAPI routes, CORS, validations
│   ├── scanner.py     # Gemini Integration, Prompt engineering, JSON extraction
│   └── schemas.py     # Pydantic models for structured reports
├── frontend/
│   ├── index.html     # Dark mode dashboard index
│   ├── app.js         # Tab switching, file processing, scanning animation, charts
│   └── styles.css     # Radar scanning, neon severities, glowing effects
├── .env.example
├── .gitignore
├── requirements.txt   # Backend package dependencies
├── run.bat            # Auto setup & launcher script for Windows
└── test_scanner.py    # Offline/Live verification script
```

---

## Setup & Running Instructions

### 1. Start the Application
Double-click `run.bat` (or execute it in your terminal) to set up the environment and run the server.

```cmd
run.bat
```
*This script will automatically detect `uv` (or install a virtual environment), install the dependencies listed in `requirements.txt`, and start the FastAPI backend on `http://127.0.0.1:8000`.*

### 2. Configure the Google Gemini API Key
To run active security scans, you need a free API key from Google AI Studio.

1. Go to [Google AI Studio](https://aistudio.google.com/) and click **Get API Key**.
2. Run the following secure PowerShell command in your terminal to write the key to the `.env` file without leaving traces in command history:

```powershell
powershell -Command "$val = Read-Host -Prompt 'Enter GEMINI_API_KEY' -AsSecureString; $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($val); $UnsecureVal = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR); Clear-Content -Path '.env'; Add-Content -Path '.env' -Value \"GEMINI_API_KEY=$UnsecureVal\"; Write-Host 'Key saved successfully!'"
```

Alternatively, open the `.env` file in a text editor and add the key directly:
```text
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Open the Dashboard
Navigate to **`http://localhost:8000`** in your browser. You can now drag and drop code files or paste snippets directly to check them for security flaws!

---

## Verifying the Setup
You can verify that the system validates code scans properly by running the verification script:
```cmd
uv run python test_scanner.py
```
This runs an offline validation test to verify that the scanner parses security reports according to the correct Pydantic schemas, followed by a live API test (if `GEMINI_API_KEY` is present).
