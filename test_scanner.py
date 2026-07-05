import os
import json
from dotenv import load_dotenv
from backend.scanner import Scanner
from backend.schemas import ScanResponse

def run_offline_validation_test():
    """
    Tests the JSON parsing and validation logic of scanner.py on a simulated JSON response.
    """
    print("\n--- Running Offline JSON Parsing & Schema Validation Test ---")
    mock_llm_response = """
    {
      "vulnerabilities_found": true,
      "summary": "This code contains a critical vulnerability related to SQL Injection.",
      "issues": [
        {
          "title": "SQL Injection",
          "severity": "High",
          "line_number": "15",
          "description": "User input is directly concatenated into a SQL statement, allowing arbitrary database commands.",
          "vulnerable_code": "query = f\\\"SELECT * FROM users WHERE username = '{username}'\\\"",
          "secure_fix": "query = \\\"SELECT * FROM users WHERE username = ?\\\"; cursor.execute(query, (username,))"
        }
      ]
    }
    """
    scanner = Scanner()
    try:
        # Check standard JSON load and schema validation
        data = json.loads(mock_llm_response.strip())
        validated = ScanResponse(**data)
        print("Success: Validated standard response schema successfully!")
        print(f"Summary: {validated.summary}")
        print(f"Issues Found: {len(validated.issues)} issues detected.")
    except Exception as e:
        print(f"Failure: Offline validation failed: {e}")

def run_live_api_test():
    """
    Attempts to run a live scan on a dummy vulnerable script if GEMINI_API_KEY is configured.
    """
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("\n--- Live API Scan Test (Skipped) ---")
        print("GEMINI_API_KEY not found in .env. Skipping live API scan test.")
        print("Please configure your key and run this script again to verify connectivity.")
        return
        
    print("\n--- Running Live API Scan Test ---")
    dummy_code = """
    # Insecure python script for testing
    import sqlite3

    def get_user_data(username):
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        
        # SQL Injection vulnerability below:
        query = "SELECT * FROM users WHERE username = '" + username + "'"
        cursor.execute(query)
        return cursor.fetchall()
    """
    
    scanner = Scanner()
    print("Sending dummy code to Gemini for security scan...")
    try:
        result = scanner.scan_code(dummy_code, filename="user_database.py")
        print("\nScan Finished successfully! Response details:")
        print(f"Vulnerabilities found: {result.vulnerabilities_found}")
        print(f"Summary: {result.summary}")
        for idx, issue in enumerate(result.issues, 1):
            print(f"\nIssue #{idx}:")
            print(f"  Title: {issue.title}")
            print(f"  Severity: {issue.severity}")
            print(f"  Line: {issue.line_number}")
            print(f"  Description: {issue.description}")
            print(f"  Insecure Code: {issue.vulnerable_code.strip()}")
            print(f"  Secure Fix: {issue.secure_fix.strip()}")
    except Exception as e:
        print(f"Error occurred during live Gemini scan: {e}")

if __name__ == "__main__":
    run_offline_validation_test()
    run_live_api_test()
