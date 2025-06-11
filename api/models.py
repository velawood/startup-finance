"""
Pydantic models for cap table data extraction.
These models match the TypeScript schema defined in the frontend.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal, Dict
from datetime import datetime


class VestingSchedule(BaseModel):
    cliff: Optional[str] = None  # e.g., "12 months"
    totalVestingPeriod: Optional[str] = None  # e.g., "48 months"
    startDate: Optional[str] = None  # ISO 8601
    accelerationClauses: Optional[List[str]] = None


class CommonStockHolder(BaseModel):
    holderName: str
    shares: int
    vestingSchedule: Optional[VestingSchedule] = None
    notes: Optional[str] = None

    @validator('shares')
    def shares_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Shares must be positive')
        return v


class OptionsPool(BaseModel):
    issued: int
    unissued: int
    targetPoolPercentage: Optional[float] = Field(None, ge=0, le=100)
    vestingDefaults: Optional[VestingSchedule] = None


class AdditionalTerms(BaseModel):
    interest: Optional[float] = None
    expirationDate: Optional[str] = None
    customTerms: Optional[str] = None


class SAFEInvestment(BaseModel):
    investorName: str
    investmentAmount: float
    valuationCap: Optional[float] = None  # Optional for uncapped SAFEs
    discount: float = Field(ge=0, le=100)  # 0-100 (percentage)
    conversionType: Literal["post", "pre", "mfn"]
    dateExecuted: Optional[str] = None  # ISO 8601
    sideLetters: Optional[List[Literal["mfn", "pro-rata"]]] = None
    additionalTerms: Optional[AdditionalTerms] = None

    @validator('investmentAmount')
    def investment_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Investment amount must be positive')
        return v


class ParticipationRights(BaseModel):
    multiplier: Optional[float] = None
    cap: Optional[float] = None


class SeriesInvestor(BaseModel):
    investorName: str
    investmentAmount: float
    proRataRights: Optional[bool] = None
    participationRights: Optional[ParticipationRights] = None

    @validator('investmentAmount')
    def investment_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Investment amount must be positive')
        return v


class PricedRound(BaseModel):
    roundName: str  # "Series A", "Series B", etc.
    investors: List[SeriesInvestor]
    preMoneyValuation: float
    targetOptionsPool: Optional[float] = Field(None, ge=0, le=100)
    dateCompleted: Optional[str] = None  # ISO 8601
    boardSeats: Optional[List[str]] = None


class CapTableData(BaseModel):
    commonStock: List[CommonStockHolder]
    options: OptionsPool
    safes: List[SAFEInvestment]
    pricedRounds: Optional[List[PricedRound]] = None
    unusedShares: Optional[int] = None


class ExtractConfidence(BaseModel):
    overall: float = Field(ge=0, le=100)
    details: Optional[Dict[str, float]] = None


class ImportMetadata(BaseModel):
    companyName: Optional[str] = None
    dateGenerated: str  # ISO 8601 format
    source: Literal["excel", "documents", "mixed", "manual"]
    extractionConfidence: Optional[ExtractConfidence] = None


class CapTableImportData(BaseModel):
    version: Literal["1.0", "1.1"] = "1.0"
    metadata: ImportMetadata
    capTable: CapTableData
    extractionNotes: Optional[List[str]] = None
