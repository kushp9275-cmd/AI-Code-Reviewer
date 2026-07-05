import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional
import logging

from .schemas import ScanResponse
from .scanner import Scanner

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Secure AI-Driven Code Reviewer",
    description="Static Application Security Testing (SAST) tool powered by Google Gemini",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize scanner
scanner = Scanner()

@app.post("/api/scan", response_model=ScanResponse)
async def scan_code_endpoint(
    code_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    filename: Optional[str] = Form(None)
):
    """
    Scans submitted code or file content for security vulnerabilities.
    """
    content = ""
    filename_context = "snippet.txt"

    # 1. Validate inputs
    if not file and not code_text:
        raise HTTPException(
            status_code=400, 
            detail="Please provide either a file upload or a code text snippet."
        )

    # 2. Handle file upload
    if file:
        filename_context = file.filename or "uploaded_file.txt"
        logger.info(f"Received file upload: {filename_context}")
        
        # Validate file size (2MB limit)
        max_size = 2 * 1024 * 1024  # 2MB
        file_bytes = await file.read()
        
        if len(file_bytes) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum size limit of 2MB (current size: {len(file_bytes) / 1024 / 1024:.2f}MB)"
            )
            
        # Try decoding file bytes to string
        try:
            content = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                # Fallback to latin-1 encoding
                content = file_bytes.decode("latin-1")
                logger.warning(f"File {filename_context} fell back to latin-1 encoding.")
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="Failed to decode file. Please ensure it is a valid text/source code file."
                )
    # 3. Handle code text
    elif code_text:
        logger.info("Received raw code text input.")
        content = code_text
        filename_context = filename or "code_snippet.txt"

    # 4. Check if code content is empty
    if not content.strip():
        raise HTTPException(
            status_code=400,
            detail="The submitted code content is empty."
        )

    # 5. Call AI Scanner
    try:
        scan_result = scanner.scan_code(content, filename=filename_context)
        return scan_result
    except ValueError as ve:
        # Configuration error (missing API key)
        logger.error(f"Configuration error: {ve}")
        raise HTTPException(status_code=500, detail=str(ve))
    except Exception as e:
        logger.error(f"Internal scan error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while scanning the code: {str(e)}"
        )

@app.get("/api/status")
def get_status():
    """
    Returns the configuration status of the AI engine.
    """
    return {
        "configured": scanner.is_configured(),
        "provider": "Google Gemini"
    }

# Serve the login.html file
@app.get("/login")
def read_login():
    login_path = os.path.join("frontend", "login.html")
    if os.path.exists(login_path):
        return FileResponse(login_path)
    return {"message": "Login page not found."}

# Serve the profile.html file
@app.get("/profile")
def read_profile():
    profile_path = os.path.join("frontend", "profile.html")
    if os.path.exists(profile_path):
        return FileResponse(profile_path)
    return {"message": "Profile page not found."}

# Serve the signup.html file
@app.get("/signup")
def read_signup():
    signup_path = os.path.join("frontend", "signup.html")
    if os.path.exists(signup_path):
        return FileResponse(signup_path)
    return {"message": "Signup page not found."}

# Serve the index.html file on root
@app.get("/")
def read_root():
    index_path = os.path.join("frontend", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Secure AI-Driven Code Reviewer Backend running. Frontend files not found."}

# Mount static files (like styles.css and app.js) from the frontend folder
# Check if frontend directory exists first, to avoid crash on start
if os.path.exists("frontend"):
    app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")
else:
    logger.warning("frontend directory not found. Static files route `/frontend` will not be mounted.")
