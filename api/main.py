"""
FastAPI application for extracting cap table data from PDF documents.
"""
import io
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from extractor import CapTableExtractor
from models import CapTableImportData

# Initialize FastAPI app
app = FastAPI(
    title="Cap Table Extractor API",
    description="Extract structured cap table data from PDF documents using AI",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the extractor (API key from environment variable)
extractor = CapTableExtractor()


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Cap Table Extractor API"}


@app.post("/extract-pdf", response_model=CapTableImportData)
async def extract_pdf(
    file: UploadFile = File(...),
    company_name: Optional[str] = Form(None)
):
    """
    Extract cap table data from a PDF file.
    
    Args:
        file: PDF file to extract data from
        company_name: Optional company name to include in the metadata
    
    Returns:
        Structured cap table data in the import format
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )
    
    # Read file content
    try:
        content = await file.read()
        pdf_file = io.BytesIO(content)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read file: {str(e)}"
        )
    
    # Extract cap table data
    try:
        result = await extractor.extract_cap_table_from_pdf(pdf_file, company_name)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract cap table data: {str(e)}"
        )


@app.post("/extract-text", response_model=CapTableImportData)
async def extract_text(
    text: str = Form(...),
    company_name: Optional[str] = Form(None)
):
    """
    Extract cap table data from plain text (useful for testing).
    
    Args:
        text: Text content to extract data from
        company_name: Optional company name to include in the metadata
    
    Returns:
        Structured cap table data in the import format
    """
    try:
        result = await extractor.extract_cap_table_from_text(text, company_name)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract cap table data: {str(e)}"
        )


@app.get("/sample-output")
async def sample_output():
    """
    Get a sample output to understand the expected format.
    """
    return {
        "version": "1.0",
        "metadata": {
            "companyName": "Example Startup Inc.",
            "dateGenerated": "2025-01-06T12:00:00",
            "source": "documents",
            "extractionConfidence": {
                "overall": 85.0,
                "details": {
                    "safes": 90.0,
                    "commonStock": 85.0,
                    "options": 80.0,
                    "pricedRounds": 85.0
                }
            }
        },
        "capTable": {
            "commonStock": [
                {
                    "holderName": "John Founder",
                    "shares": 4500000,
                    "vestingSchedule": {
                        "cliff": "12 months",
                        "totalVestingPeriod": "48 months",
                        "startDate": "2023-01-01"
                    }
                }
            ],
            "options": {
                "issued": 250000,
                "unissued": 750000,
                "targetPoolPercentage": 10.0
            },
            "safes": [
                {
                    "investorName": "YC",
                    "investmentAmount": 125000,
                    "valuationCap": 1785714,
                    "discount": 0,
                    "conversionType": "post"
                }
            ],
            "pricedRounds": None
        },
        "extractionNotes": [
            "Successfully extracted 1 SAFE investment",
            "Found 1 common stockholder"
        ]
    }


if __name__ == "__main__":
    # Run the app with uvicorn when executed directly
    uvicorn.run(app, host="0.0.0.0", port=8000)
