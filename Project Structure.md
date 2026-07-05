# Secure AI-Driven Code Reviewer

## 1. Project Overview
An automated Static Application Security Testing (SAST) tool and code reviewer. The application allows developers to submit or upload source code files, parses the code, and utilizes a Generative AI LLM API to scan for security vulnerabilities (focusing heavily on the OWASP Top 10), logical bugs, and code efficiency issues. It outputs a structured security report with automated remediation suggestions.

## 2. Core Features (Implementation Scope)
* **File Upload & Parsing:** A backend system capable of accepting source code files (Python, JavaScript, Java) or raw text input.
* **AI Vulnerability Scanner:** Secure integration with a Generative AI API (e.g., OpenAI API or Google Gemini API) using targeted system prompts to detect security flaws like SQL Injection, XSS, Hardcoded Credentials, and Broken Access Control.
* **Structured Security Report:** Parsed JSON output from the AI displayed in a clean, professional web dashboard.
* **Remediation Engine:** For every vulnerability detected, the AI must provide a "Secure Code Snippet" fix.

## 3. Architecture & Tech Stack
The agent must implement the project using the following stack:
* **Backend:** Python (Flask or FastAPI)
* **Frontend:** HTML5, CSS3 (Tailwind CSS preferred for a modern, clean UI), JavaScript (Vanilla)
* **AI Integration:** Python `google-generativeai` or `openai` SDK 
* **Environment Management:** `.env` file for secure API key storage (do NOT hardcode keys)

## 4. Technical Specifications & Guidelines for the Agent
Dear Agent, please follow these strict phase-by-phase implementation instructions:

### Phase 1: Project Setup & Environment
1. Create a virtual environment and a `requirements.txt` file containing `fastapi` (or `flask`), `uvicorn`, `python-dotenv`, and the selected AI SDK.
2. Initialize a `.env` file to hold the `AI_API_KEY`. 

### Phase 2: Backend API Development
1. Build an endpoint `/api/scan` that accepts multi-part file uploads or a text string representing code.
2. Implement file validation: Ensure the tool only accepts valid code extensions (`.py`, `.js`, `.java`, `.txt`) and restricts file size to < 2MB.

### Phase 3: AI Prompt Engineering & Integration
1. Write a robust system prompt for the LLM. Instruct it to act strictly as a **Principal Application Security Engineer**.
2. Force the AI to return its analysis in a strict, valid JSON format so the backend can parse it reliably. The JSON structure must strictly follow:
```json
{
  "vulnerabilities_found": true/false,
  "summary": "Brief high-level overview of code health",
  "issues": [
    {
      "title": "Vulnerability Name (e.g., SQL Injection)",
      "severity": "High/Medium/Low",
      "line_number": "Approximate line number or 'N/A'",
      "description": "Why this code is dangerous.",
      "vulnerable_code": "The specific snippet that is insecure",
      "secure_fix": "The corrected, secure code snippet"
    }
  ]
}