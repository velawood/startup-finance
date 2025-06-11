import { CapTableImportData, CommonStockHolder, SAFEInvestment, SeriesInvestor, PricedRound } from '../types/cap-table-import.schema';
import { IConversionStateData, IRowState, ExistingShareholderState, SAFEState, SeriesState } from '../state/ConversionState';
import { CapTableRowType } from '@library/cap-table/types';

/**
 * Maps imported cap table data to the ConversionState format
 */
export function mapImportDataToState(importData: CapTableImportData): IConversionStateData {
  const rowData: IRowState[] = [];
  let idCounter = 0;
  
  // Map common stockholders
  if (importData.capTable.commonStock) {
    importData.capTable.commonStock.forEach((holder: CommonStockHolder) => {
      const commonRow: ExistingShareholderState = {
        id: (idCounter++).toString(),
        type: CapTableRowType.Common,
        name: holder.holderName,
        shares: holder.shares
      };
      rowData.push(commonRow);
    });
  }

  // Add issued options
  if (importData.capTable.options?.issued) {
    const optionsRow: ExistingShareholderState = {
      id: "IssuedOptions",
      type: CapTableRowType.Common,
      name: "Issued Options",
      shares: importData.capTable.options.issued
    };
    rowData.push(optionsRow);
  }

  // Map SAFEs
  if (importData.capTable.safes) {
    importData.capTable.safes.forEach((safe: SAFEInvestment) => {
      // Handle special conversion types
      let conversionType: "post" | "pre" | "mfn" | "yc7p" | "ycmfn" = safe.conversionType;
      
      // Check if this is a YC 7% SAFE based on pattern
      if (safe.investorName.toLowerCase().includes('yc') && 
          safe.valuationCap && 
          Math.abs(safe.investmentAmount / 0.07 - safe.valuationCap) < 1000) {
        conversionType = 'yc7p';
      }
      
      // Check if this is a YC MFN SAFE
      if (safe.investorName.toLowerCase().includes('yc') && 
          safe.investorName.toLowerCase().includes('mfn')) {
        conversionType = 'ycmfn';
      }

      const safeRow: SAFEState = {
        id: (idCounter++).toString(),
        type: CapTableRowType.Safe,
        name: safe.investorName,
        investment: safe.investmentAmount,
        discount: safe.discount,
        cap: safe.valuationCap || 0, // Default to 0 for uncapped
        conversionType: conversionType
      };
      rowData.push(safeRow);
    });
  }

  // Map Series investors from priced rounds
  let preMoneyValuation = 36000000; // Default pre-money
  let targetOptionsPool = 10; // Default target pool
  let hasPricedRound = false;

  if (importData.capTable.pricedRounds && importData.capTable.pricedRounds.length > 0) {
    hasPricedRound = true;
    // Use the first priced round for the main parameters
    const firstRound = importData.capTable.pricedRounds[0];
    preMoneyValuation = firstRound.preMoneyValuation;
    targetOptionsPool = firstRound.targetOptionsPool || 10;

    // Add all investors from all rounds
    importData.capTable.pricedRounds.forEach((round: PricedRound) => {
      round.investors.forEach((investor: SeriesInvestor) => {
        const seriesRow: SeriesState = {
          id: (idCounter++).toString(),
          type: CapTableRowType.Series,
          name: investor.investorName,
          investment: investor.investmentAmount
        };
        rowData.push(seriesRow);
      });
    });
  }

  return {
    rowData,
    preMoney: preMoneyValuation,
    targetOptionsPool,
    unusedOptions: importData.capTable.options?.unissued || 0,
    pricedRounds: hasPricedRound ? 1 : 0
  };
}

/**
 * Merge strategies for importing data
 */
export enum MergeStrategy {
  Replace = 'replace',
  Merge = 'merge'
}

/**
 * Merges imported data with existing state based on the selected strategy
 */
export function mergeImportData(
  existingState: IConversionStateData,
  importedState: IConversionStateData,
  strategy: MergeStrategy
): IConversionStateData {
  if (strategy === MergeStrategy.Replace) {
    return importedState;
  }

  // Merge strategy: combine data intelligently
  const mergedRowData = [...existingState.rowData];
  let nextId = Math.max(
    ...existingState.rowData
      .map(row => parseInt(row.id || '0'))
      .filter(id => !isNaN(id)),
    0
  ) + 1;

  // Add new common stockholders (avoid duplicates by name)
  const existingCommonNames = new Set(
    existingState.rowData
      .filter(row => row.type === CapTableRowType.Common)
      .map(row => row.name?.toLowerCase())
  );

  importedState.rowData
    .filter(row => row.type === CapTableRowType.Common)
    .forEach(row => {
      if (!existingCommonNames.has(row.name?.toLowerCase())) {
        mergedRowData.push({
          ...row,
          id: row.id === "IssuedOptions" ? row.id : (nextId++).toString()
        });
      }
    });

  // Add new SAFEs (check for duplicates by investor name and amount)
  const existingSafes = new Set(
    existingState.rowData
      .filter(row => row.type === CapTableRowType.Safe)
      .map(row => `${row.name?.toLowerCase()}_${row.investment}`)
  );

  importedState.rowData
    .filter(row => row.type === CapTableRowType.Safe)
    .forEach(row => {
      const safeKey = `${row.name?.toLowerCase()}_${row.investment}`;
      if (!existingSafes.has(safeKey)) {
        mergedRowData.push({
          ...row,
          id: (nextId++).toString()
        });
      }
    });

  // Add new Series investors
  const existingSeries = new Set(
    existingState.rowData
      .filter(row => row.type === CapTableRowType.Series)
      .map(row => `${row.name?.toLowerCase()}_${row.investment}`)
  );

  importedState.rowData
    .filter(row => row.type === CapTableRowType.Series)
    .forEach(row => {
      const seriesKey = `${row.name?.toLowerCase()}_${row.investment}`;
      if (!existingSeries.has(seriesKey)) {
        mergedRowData.push({
          ...row,
          id: (nextId++).toString()
        });
      }
    });

  // Use imported values for other parameters if they seem more complete
  const hasImportedPricedRound = (importedState.pricedRounds || 0) > 0;
  const hasExistingPricedRound = (existingState.pricedRounds || 0) > 0;

  return {
    rowData: mergedRowData,
    preMoney: hasImportedPricedRound && !hasExistingPricedRound 
      ? importedState.preMoney 
      : existingState.preMoney,
    targetOptionsPool: hasImportedPricedRound && !hasExistingPricedRound
      ? importedState.targetOptionsPool
      : existingState.targetOptionsPool,
    unusedOptions: Math.max(existingState.unusedOptions, importedState.unusedOptions),
    pricedRounds: Math.max(existingState.pricedRounds || 0, importedState.pricedRounds || 0)
  };
}

/**
 * Creates example import data for demonstration/testing
 */
export function createExampleImportData(): CapTableImportData {
  return {
    version: "1.0",
    metadata: {
      companyName: "Example Startup Inc.",
      dateGenerated: new Date().toISOString(),
      source: "manual",
      extractionConfidence: {
        overall: 95
      }
    },
    capTable: {
      commonStock: [
        {
          holderName: "Jane Founder",
          shares: 4000000,
          vestingSchedule: {
            cliff: "12 months",
            totalVestingPeriod: "48 months",
            startDate: "2023-01-01"
          }
        },
        {
          holderName: "John Co-Founder",
          shares: 4000000,
          vestingSchedule: {
            cliff: "12 months",
            totalVestingPeriod: "48 months",
            startDate: "2023-01-01"
          }
        }
      ],
      options: {
        issued: 300000,
        unissued: 700000,
        targetPoolPercentage: 10
      },
      safes: [
        {
          investorName: "YC",
          investmentAmount: 125000,
          valuationCap: 1785714,
          discount: 0,
          conversionType: "post",
          dateExecuted: "2024-01-15"
        },
        {
          investorName: "Angel Investor 1",
          investmentAmount: 250000,
          valuationCap: 8000000,
          discount: 20,
          conversionType: "post",
          dateExecuted: "2024-03-01"
        },
        {
          investorName: "Seed Fund ABC",
          investmentAmount: 500000,
          valuationCap: 10000000,
          discount: 0,
          conversionType: "post",
          dateExecuted: "2024-06-01",
          sideLetters: ["pro-rata"]
        }
      ],
      pricedRounds: [
        {
          roundName: "Series A",
          investors: [
            {
              investorName: "Lead VC Fund",
              investmentAmount: 3000000,
              proRataRights: true
            },
            {
              investorName: "Following VC",
              investmentAmount: 1000000,
              proRataRights: true
            }
          ],
          preMoneyValuation: 20000000,
          targetOptionsPool: 15,
          dateCompleted: "2024-12-01"
        }
      ]
    },
    extractionNotes: [
      "All data manually verified",
      "Vesting schedules confirmed with legal documents"
    ]
  };
}
