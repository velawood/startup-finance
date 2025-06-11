// Schema for importing cap table data from companion app

export interface CapTableImportData {
  version: "1.0" | "1.1"; // Versioning for future compatibility
  metadata: ImportMetadata;
  capTable: CapTableData;
  extractionNotes?: string[]; // Warnings/notes from companion app
}

export interface ImportMetadata {
  companyName?: string;
  dateGenerated: string; // ISO 8601 format
  source: "excel" | "documents" | "mixed" | "manual";
  extractionConfidence?: {
    overall: number; // 0-100
    details?: Record<string, number>;
  };
}

export interface CapTableData {
  commonStock: CommonStockHolder[];
  options: OptionsPool;
  safes: SAFEInvestment[];
  pricedRounds?: PricedRound[];
  unusedShares?: number; // For unallocated shares
}

export interface CommonStockHolder {
  holderName: string;
  shares: number;
  vestingSchedule?: VestingSchedule;
  notes?: string;
}

export interface VestingSchedule {
  cliff?: string; // e.g., "12 months"
  totalVestingPeriod?: string; // e.g., "48 months"
  startDate?: string; // ISO 8601
  accelerationClauses?: string[];
}

export interface OptionsPool {
  issued: number;
  unissued: number;
  targetPoolPercentage?: number; // Post-money %
  vestingDefaults?: VestingSchedule;
}

export interface SAFEInvestment {
  investorName: string;
  investmentAmount: number;
  valuationCap?: number; // Optional for uncapped SAFEs
  discount: number; // 0-100 (percentage)
  conversionType: "post" | "pre" | "mfn";
  dateExecuted?: string; // ISO 8601
  sideLetters?: ("mfn" | "pro-rata")[];
  additionalTerms?: {
    interest?: number;
    expirationDate?: string;
    customTerms?: string;
  };
}

export interface PricedRound {
  roundName: string; // "Series A", "Series B", etc.
  investors: SeriesInvestor[];
  preMoneyValuation: number;
  targetOptionsPool?: number; // Post-money %
  dateCompleted?: string; // ISO 8601
  boardSeats?: string[]; // Names of investors getting board seats
}

export interface SeriesInvestor {
  investorName: string;
  investmentAmount: number;
  proRataRights?: boolean;
  participationRights?: {
    multiplier?: number;
    cap?: number;
  };
}
