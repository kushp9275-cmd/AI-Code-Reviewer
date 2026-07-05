from pydantic import BaseModel, Field
from typing import List, Union

class SecurityIssue(BaseModel):
    title: str = Field(description="Vulnerability Name (e.g., SQL Injection)")
    severity: str = Field(description="Severity: High, Medium, or Low")
    line_number: Union[int, str] = Field(description="Approximate line number or 'N/A'")
    description: str = Field(description="Why this code is dangerous.")
    vulnerable_code: str = Field(description="The specific snippet that is insecure")
    secure_fix: str = Field(description="The corrected, secure code snippet")

class ScanResponse(BaseModel):
    vulnerabilities_found: bool = Field(description="Whether any security vulnerabilities were detected")
    summary: str = Field(description="Brief high-level overview of code health")
    issues: List[SecurityIssue] = Field(description="List of detected vulnerabilities and code quality issues")
