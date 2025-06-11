"""
PDF text extraction and AI-powered parsing using pydantic-ai.
"""
import io
from typing import List, Optional
from datetime import datetime
import pdfplumber
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel
from models import (
    SAFEInvestment,
    CommonStockHolder,
    OptionsPool,
    PricedRound,
    CapTableData,
    ImportMetadata,
    CapTableImportData,
    ExtractConfidence
)


# System prompts for different extraction tasks
SAFE_EXTRACTION_PROMPT = """
You are an expert at extracting SAFE (Simple Agreement for Future Equity) investment details from legal documents.
Extract all SAFE investments from the provided text. Look for:
- Investor names
- Investment amounts (in dollars)
- Valuation caps (if specified)
- Discount rates (as percentages, 0-100)
- Conversion type (post-money, pre-money, or MFN)
- Execution dates
- Any side letters (MFN provisions, pro-rata rights)

Common patterns:
- YC SAFEs often have 7% ownership targets (calculate cap as investment / 0.07)
- MFN (Most Favored Nation) SAFEs may not have explicit caps
- Look for phrases like "post-money valuation cap", "discount rate", "MFN provisions"
"""

STOCKHOLDER_EXTRACTION_PROMPT = """
You are an expert at extracting stockholder information from cap tables and legal documents.
Extract all common stockholders (founders, employees with vested shares). Look for:
- Holder names
- Number of shares
- Vesting schedules (cliff periods, total vesting period, start dates)
- Any acceleration clauses

Ignore options that haven't been exercised yet.
"""

OPTIONS_EXTRACTION_PROMPT = """
You are an expert at extracting stock option pool information from documents.
Extract:
- Number of issued options (already granted to employees)
- Number of unissued options (reserved but not yet granted)
- Target option pool percentage (typically 10-20% post-money)
- Default vesting terms if specified
"""

PRICED_ROUND_EXTRACTION_PROMPT = """
You are an expert at extracting priced equity round information from documents.
Extract all Series A, B, C etc. rounds. Look for:
- Round name (Series A, Series B, etc.)
- All investors and their investment amounts
- Pre-money valuation
- Target option pool refresh percentage
- Completion date
- Board seat allocations
"""


class CapTableExtractor:
    def __init__(self):
        """Initialize the extractor with OpenAI model."""
        model_kwargs = {}       
        self.model = OpenAIModel('gpt-4.1', **model_kwargs)
        
        # Initialize agents for different extraction tasks
        self.safe_agent = Agent(
            model=self.model,
            result_type=List[SAFEInvestment],
            system_prompt=SAFE_EXTRACTION_PROMPT
        )
        
        self.stockholder_agent = Agent(
            model=self.model,
            result_type=List[CommonStockHolder],
            system_prompt=STOCKHOLDER_EXTRACTION_PROMPT
        )
        
        self.options_agent = Agent(
            model=self.model,
            result_type=OptionsPool,
            system_prompt=OPTIONS_EXTRACTION_PROMPT
        )
        
        self.priced_round_agent = Agent(
            model=self.model,
            result_type=List[PricedRound],
            system_prompt=PRICED_ROUND_EXTRACTION_PROMPT
        )

    def extract_text_from_pdf(self, pdf_file: io.BytesIO) -> str:
        """Extract text from PDF file."""
        text_parts = []
        
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        
        return "\n\n".join(text_parts)

    async def extract_cap_table_from_text(self, text: str, company_name: Optional[str] = None) -> CapTableImportData:
        """Extract structured cap table data from document text."""
        extraction_notes = []
        confidence_scores = {}
        
        try:
            # Extract SAFEs
            safe_result = await self.safe_agent.run(text)
            safes = safe_result.data
            confidence_scores['safes'] = 90 if safes else 50
        except Exception as e:
            safes = []
            extraction_notes.append(f"Failed to extract SAFEs: {str(e)}")
            confidence_scores['safes'] = 0
        
        try:
            # Extract common stockholders
            stockholder_result = await self.stockholder_agent.run(text)
            common_stock = stockholder_result.data
            confidence_scores['commonStock'] = 90 if common_stock else 50
        except Exception as e:
            common_stock = []
            extraction_notes.append(f"Failed to extract stockholders: {str(e)}")
            confidence_scores['commonStock'] = 0
        
        try:
            # Extract options pool
            options_result = await self.options_agent.run(text)
            options = options_result.data
            confidence_scores['options'] = 90
        except Exception as e:
            # Default options pool if extraction fails
            options = OptionsPool(issued=0, unissued=0, targetPoolPercentage=10.0)
            extraction_notes.append(f"Failed to extract options pool, using defaults: {str(e)}")
            confidence_scores['options'] = 0
        
        try:
            # Extract priced rounds
            priced_result = await self.priced_round_agent.run(text)
            priced_rounds = priced_result.data if priced_result.data else None
            confidence_scores['pricedRounds'] = 90 if priced_rounds else 50
        except Exception as e:
            priced_rounds = None
            extraction_notes.append(f"Failed to extract priced rounds: {str(e)}")
            confidence_scores['pricedRounds'] = 0
        
        # Calculate overall confidence
        overall_confidence = sum(confidence_scores.values()) / len(confidence_scores)
        
        # Create the complete import data structure
        cap_table_data = CapTableData(
            commonStock=common_stock,
            options=options,
            safes=safes,
            pricedRounds=priced_rounds
        )
        
        metadata = ImportMetadata(
            companyName=company_name,
            dateGenerated=datetime.now().isoformat(),
            source="documents",
            extractionConfidence=ExtractConfidence(
                overall=overall_confidence,
                details=confidence_scores
            )
        )
        
        return CapTableImportData(
            version="1.0",
            metadata=metadata,
            capTable=cap_table_data,
            extractionNotes=extraction_notes if extraction_notes else None
        )

    async def extract_cap_table_from_pdf(self, pdf_file: io.BytesIO, company_name: Optional[str] = None) -> CapTableImportData:
        """Extract structured cap table data from PDF file."""
        text = self.extract_text_from_pdf(pdf_file)
        return await self.extract_cap_table_from_text(text, company_name)
