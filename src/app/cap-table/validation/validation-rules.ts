import { 
  CapTableImportData, 
  CommonStockHolder, 
  SAFEInvestment, 
  SeriesInvestor,
  OptionsPool,
  PricedRound
} from '../types/cap-table-import.schema';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error";
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: "warning";
  suggestion?: string;
}

export interface ValidationSummary {
  foundersCount: number;
  safesCount: number;
  totalSAFEInvestment: number;
  seriesInvestorsCount: number;
  totalSeriesInvestment: number;
}

// Helper functions
function calculateTotalSAFEInvestment(data: Partial<CapTableImportData>): number {
  if (!data.capTable?.safes) return 0;
  return data.capTable.safes.reduce((sum: number, safe: SAFEInvestment) => 
    sum + safe.investmentAmount, 0
  );
}

function countSeriesInvestors(data: Partial<CapTableImportData>): number {
  if (!data.capTable?.pricedRounds) return 0;
  return data.capTable.pricedRounds.reduce((count: number, round) => 
    count + (round.investors?.length || 0), 0
  );
}

function calculateTotalSeriesInvestment(data: Partial<CapTableImportData>): number {
  if (!data.capTable?.pricedRounds) return 0;
  return data.capTable.pricedRounds.reduce((sum: number, round) => {
    const roundTotal = round.investors?.reduce((roundSum: number, inv: SeriesInvestor) => 
      roundSum + inv.investmentAmount, 0
    ) || 0;
    return sum + roundTotal;
  }, 0);
}

// Validation functions
export const validateSchemaVersion = (version: string): ValidationError | null => {
  if (!["1.0", "1.1"].includes(version)) {
    return {
      field: "version",
      message: `Unsupported schema version: ${version}. Supported versions are 1.0 and 1.1`,
      severity: "error"
    };
  }
  return null;
};

export const validateCommonStock = (commonStock: CommonStockHolder[]): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!Array.isArray(commonStock) || commonStock.length === 0) {
    errors.push({
      field: "capTable.commonStock",
      message: "At least one common stockholder is required",
      severity: "error"
    });
    return errors;
  }

  commonStock.forEach((holder, index) => {
    if (!holder.holderName || holder.holderName.trim() === "") {
      errors.push({
        field: `capTable.commonStock[${index}].holderName`,
        message: "Holder name is required",
        severity: "error"
      });
    }
    
    if (!Number.isInteger(holder.shares) || holder.shares <= 0) {
      errors.push({
        field: `capTable.commonStock[${index}].shares`,
        message: "Shares must be a positive integer",
        severity: "error"
      });
    }
  });

  return errors;
};

export const validateOptionsPool = (options: Partial<OptionsPool>): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!options) {
    errors.push({
      field: "capTable.options",
      message: "Options pool information is required",
      severity: "error"
    });
    return errors;
  }

  if (options.issued === undefined || !Number.isInteger(options.issued) || options.issued < 0) {
    errors.push({
      field: "capTable.options.issued",
      message: "Issued options must be a non-negative integer",
      severity: "error"
    });
  }

  if (options.unissued === undefined || !Number.isInteger(options.unissued) || options.unissued < 0) {
    errors.push({
      field: "capTable.options.unissued",
      message: "Unissued options must be a non-negative integer",
      severity: "error"
    });
  }

  if (options.targetPoolPercentage !== undefined) {
    if (options.targetPoolPercentage < 0 || options.targetPoolPercentage > 100) {
      errors.push({
        field: "capTable.options.targetPoolPercentage",
        message: "Target pool percentage must be between 0 and 100",
        severity: "error"
      });
    }
  }

  return errors;
};

export const validateSAFEs = (safes: SAFEInvestment[]): (ValidationError | ValidationWarning)[] => {
  const issues: (ValidationError | ValidationWarning)[] = [];
  
  if (!Array.isArray(safes)) {
    issues.push({
      field: "capTable.safes",
      message: "SAFEs must be an array",
      severity: "error"
    });
    return issues;
  }

  safes.forEach((safe, index) => {
    if (!safe.investorName || safe.investorName.trim() === "") {
      issues.push({
        field: `capTable.safes[${index}].investorName`,
        message: "Investor name is required",
        severity: "error"
      });
    }

    if (safe.investmentAmount <= 0) {
      issues.push({
        field: `capTable.safes[${index}].investmentAmount`,
        message: "Investment amount must be positive",
        severity: "error"
      });
    }

    if (safe.discount < 0 || safe.discount > 100) {
      issues.push({
        field: `capTable.safes[${index}].discount`,
        message: "Discount must be between 0 and 100%",
        severity: "error"
      });
    }

    // Valuation cap validation
    if (safe.conversionType !== "mfn" && !safe.valuationCap) {
      issues.push({
        field: `capTable.safes[${index}].valuationCap`,
        message: "Valuation cap is required for non-MFN SAFEs",
        severity: "error"
      });
    }

    if (safe.valuationCap && safe.valuationCap < safe.investmentAmount) {
      issues.push({
        field: `capTable.safes[${index}].valuationCap`,
        message: "Valuation cap is unusually low compared to investment amount",
        severity: "warning",
        suggestion: "Verify this is intentional"
      });
    }

    if (!["post", "pre", "mfn"].includes(safe.conversionType)) {
      issues.push({
        field: `capTable.safes[${index}].conversionType`,
        message: "Conversion type must be 'post', 'pre', or 'mfn'",
        severity: "error"
      });
    }
  });

  return issues;
};

export const validatePricedRounds = (pricedRounds: PricedRound[]): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!pricedRounds || pricedRounds.length === 0) {
    return errors; // Priced rounds are optional
  }

  pricedRounds.forEach((round, roundIndex) => {
    if (!round.roundName || round.roundName.trim() === "") {
      errors.push({
        field: `capTable.pricedRounds[${roundIndex}].roundName`,
        message: "Round name is required",
        severity: "error"
      });
    }

    if (round.preMoneyValuation <= 0) {
      errors.push({
        field: `capTable.pricedRounds[${roundIndex}].preMoneyValuation`,
        message: "Pre-money valuation must be positive",
        severity: "error"
      });
    }

    if (!Array.isArray(round.investors) || round.investors.length === 0) {
      errors.push({
        field: `capTable.pricedRounds[${roundIndex}].investors`,
        message: "At least one investor is required for a priced round",
        severity: "error"
      });
    } else {
      round.investors.forEach((investor: SeriesInvestor, invIndex: number) => {
        if (!investor.investorName || investor.investorName.trim() === "") {
          errors.push({
            field: `capTable.pricedRounds[${roundIndex}].investors[${invIndex}].investorName`,
            message: "Investor name is required",
            severity: "error"
          });
        }

        if (investor.investmentAmount <= 0) {
          errors.push({
            field: `capTable.pricedRounds[${roundIndex}].investors[${invIndex}].investmentAmount`,
            message: "Investment amount must be positive",
            severity: "error"
          });
        }
      });
    }
  });

  return errors;
};

export const validateCrossData = (data: CapTableImportData): ValidationWarning[] => {
  const warnings: ValidationWarning[] = [];
  
  // Check for duplicate names
  const allNames: string[] = [];
  
  if (data.capTable.commonStock) {
    allNames.push(...data.capTable.commonStock.map(h => h.holderName.toLowerCase()));
  }
  
  if (data.capTable.safes) {
    allNames.push(...data.capTable.safes.map(s => s.investorName.toLowerCase()));
  }
  
  if (data.capTable.pricedRounds) {
    data.capTable.pricedRounds.forEach(round => {
      if (round.investors) {
        allNames.push(...round.investors.map(i => i.investorName.toLowerCase()));
      }
    });
  }

  const nameSet = new Set();
  const duplicates = new Set();
  
  allNames.forEach(name => {
    if (nameSet.has(name)) {
      duplicates.add(name);
    }
    nameSet.add(name);
  });

  if (duplicates.size > 0) {
    warnings.push({
      field: "names",
      message: `Duplicate names detected: ${Array.from(duplicates).join(", ")}`,
      severity: "warning",
      suggestion: "Verify if these are the same entity or different ones"
    });
  }

  // Check SAFE cap progression
  const datedSafes = data.capTable.safes
    .filter(s => s.dateExecuted && s.valuationCap)
    .sort((a, b) => new Date(a.dateExecuted!).getTime() - new Date(b.dateExecuted!).getTime());

  for (let i = 1; i < datedSafes.length; i++) {
    const prevCap = datedSafes[i - 1].valuationCap!;
    const currCap = datedSafes[i].valuationCap!;
    
    if (currCap < prevCap * 0.8) { // 20% decrease threshold
      warnings.push({
        field: "safes",
        message: `SAFE valuation cap decreased significantly from ${prevCap} to ${currCap}`,
        severity: "warning",
        suggestion: "Verify if this cap decrease is intentional"
      });
    }
  }

  return warnings;
};

// Main validation function
export async function validateImportData(data: unknown): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Validate structure
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: [{
        field: "root",
        message: "Invalid data structure",
        severity: "error"
      }],
      warnings: [],
      summary: {
        foundersCount: 0,
        safesCount: 0,
        totalSAFEInvestment: 0,
        seriesInvestorsCount: 0,
        totalSeriesInvestment: 0
      }
    };
  }

  // Type guard to safely access properties
  const importData = data as Partial<CapTableImportData>;

  // Validate version
  if (importData.version) {
    const versionError = validateSchemaVersion(importData.version);
    if (versionError) errors.push(versionError);
  } else {
    errors.push({
      field: "version",
      message: "Version is required",
      severity: "error"
    });
  }

  // Validate metadata
  if (!importData.metadata) {
    errors.push({
      field: "metadata",
      message: "Metadata is required",
      severity: "error"
    });
  }

  // Validate cap table
  if (!importData.capTable) {
    errors.push({
      field: "capTable",
      message: "Cap table data is required",
      severity: "error"
    });
  } else {
    // Validate common stock
    if (importData.capTable.commonStock) {
      errors.push(...validateCommonStock(importData.capTable.commonStock));
    }

    // Validate options
    if (importData.capTable.options) {
      errors.push(...validateOptionsPool(importData.capTable.options));
    }

    // Validate SAFEs
    if (importData.capTable.safes) {
      const safeIssues = validateSAFEs(importData.capTable.safes);
      safeIssues.forEach(issue => {
        if (issue.severity === "error") {
          errors.push(issue as ValidationError);
        } else {
          warnings.push(issue as ValidationWarning);
        }
      });
    }

    // Validate priced rounds
    if (importData.capTable.pricedRounds) {
      errors.push(...validatePricedRounds(importData.capTable.pricedRounds));
    }

    // Cross-validation
    if (importData.capTable && errors.length === 0) {
      warnings.push(...validateCrossData(importData as CapTableImportData));
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      foundersCount: importData.capTable?.commonStock?.length || 0,
      safesCount: importData.capTable?.safes?.length || 0,
      totalSAFEInvestment: calculateTotalSAFEInvestment(importData),
      seriesInvestorsCount: countSeriesInvestors(importData),
      totalSeriesInvestment: calculateTotalSeriesInvestment(importData)
    }
  };
}
