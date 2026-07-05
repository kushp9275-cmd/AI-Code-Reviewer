import os
import json
import re
import logging
from dotenv import load_dotenv
import google.generativeai as genai
from .schemas import ScanResponse

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure GenAI SDK
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    logger.warning("GEMINI_API_KEY environment variable is not set. Scan requests will fail until configured.")

class Scanner:
    def __init__(self, model_name: str = "gemini-2.5-flash"):
        self.model_name = model_name

    def is_configured(self) -> bool:
        # Check if SDK has an API key configured
        return bool(os.getenv("GEMINI_API_KEY"))

    def scan_code(self, code_content: str, filename: str = "snippet.txt") -> ScanResponse:
        """
        Scans code content using Google Gemini model and returns a structured ScanResponse.
        """
        if not self.is_configured():
            # Reload env in case it was updated after start
            load_dotenv()
            new_key = os.getenv("GEMINI_API_KEY")
            if new_key:
                genai.configure(api_key=new_key)
            else:
                raise ValueError("GEMINI_API_KEY is not configured. Please add it to your .env file.")

        file_extension = os.path.splitext(filename)[1] or ".txt"
        
        system_instruction = (
            "You are a Principal Application Security Engineer. You will perform a Static Application Security Testing (SAST) "
            "scan on the submitted code. You must analyze the code for security vulnerabilities (focusing heavily on the OWASP Top 10), "
            "logical bugs, and efficiency issues. For every vulnerability or issue found, you must provide a secure code fix.\n"
            "If no vulnerabilities or issues are found, set 'vulnerabilities_found' to false and issues list to empty.\n"
            "Return the output in a strict, valid JSON format matching the schema."
        )

        prompt = (
            f"Please scan the following source code file:\n"
            f"Filename: {filename}\n"
            f"Extension: {file_extension}\n"
            f"----------------------------------------\n"
            f"{code_content}\n"
            f"----------------------------------------\n"
            f"Provide the analysis."
        )

        try:
            logger.info(f"Sending scan request for {filename} to Gemini model: {self.model_name}")
            
            # Initialize model with system instruction
            model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=system_instruction
            )
            
            # Request structured response matching ScanResponse schema
            response = model.generate_content(
                prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": ScanResponse,
                    "temperature": 0.1  # Low temperature for deterministic security auditing
                }
            )
            
            response_text = response.text.strip()
            logger.info("Successfully received response from Gemini API.")
            
            # Parse the JSON response
            data = json.loads(response_text)
            
            # Validate and return using Pydantic
            return ScanResponse(**data)
            
        except json.JSONDecodeError as je:
            logger.error(f"JSON parsing error: {je}. Raw response was: {response_text}")
            # Try to recover or return standard error
            return self._attempt_json_recovery(response_text)
        except Exception as e:
            logger.error(f"Error during scan: {str(e)}")
            raise e

    def _attempt_json_recovery(self, raw_text: str) -> ScanResponse:
        """
        Attempts to extract JSON block from text using regex if standard JSON parsing fails.
        """
        try:
            # Look for JSON patterns inside the markdown blocks or raw text
            match = re.search(r"(\{.*?\})", raw_text, re.DOTALL)
            if match:
                data = json.loads(match.group(1))
                return ScanResponse(**data)
        except Exception as e:
            logger.error(f"Failed to recover JSON: {str(e)}")
        
        # Fallback response
        return ScanResponse(
            vulnerabilities_found=False,
            summary="An error occurred while parsing the AI response. Please try again.",
            issues=[]
        )
