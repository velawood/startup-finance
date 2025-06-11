import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FaFileImport, FaExclamationTriangle, FaCheckCircle, FaTimes } from 'react-icons/fa';
import { CapTableImportData } from '@/cap-table/types/cap-table-import.schema';
import { validateImportData, ValidationResult } from '@/cap-table/validation/validation-rules';
import { mapImportDataToState, MergeStrategy, createExampleImportData } from '@/cap-table/utils/import-data-mapper';
import { IConversionStateData } from '@/cap-table/state/ConversionState';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: IConversionStateData, strategy: MergeStrategy) => void;
}

type ImportTab = 'json' | 'help';

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<ImportTab>('json');
  const [jsonInput, setJsonInput] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [parsedData, setParsedData] = useState<CapTableImportData | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>(MergeStrategy.Replace);
  const [isValidating, setIsValidating] = useState(false);

  if (!isOpen) return null;

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResult(null);
    setParsedData(null);

    try {
      const data = JSON.parse(jsonInput);
      const result = await validateImportData(data);
      setValidationResult(result);
      
      if (result.isValid) {
        setParsedData(data as CapTableImportData);
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        errors: [{
          field: 'json',
          message: error instanceof Error ? error.message : 'Invalid JSON format',
          severity: 'error'
        }],
        warnings: [],
        summary: {
          foundersCount: 0,
          safesCount: 0,
          totalSAFEInvestment: 0,
          seriesInvestorsCount: 0,
          totalSeriesInvestment: 0
        }
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = () => {
    if (parsedData && validationResult?.isValid) {
      const stateData = mapImportDataToState(parsedData);
      onImport(stateData, mergeStrategy);
      onClose();
    }
  };

  const handleLoadExample = () => {
    const exampleData = createExampleImportData();
    setJsonInput(JSON.stringify(exampleData, null, 2));
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaFileImport className="text-nt84blue" />
            Import Cap Table Data
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b dark:border-gray-700">
          <div className="flex">
            <button
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'json'
                  ? 'text-nt84blue border-b-2 border-nt84blue'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              onClick={() => setActiveTab('json')}
            >
              JSON Import
            </button>
            <button
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'help'
                  ? 'text-nt84blue border-b-2 border-nt84blue'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              onClick={() => setActiveTab('help')}
            >
              Schema Help
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Paste your cap table JSON data here:
                </label>
                <Button
                  onClick={handleLoadExample}
                  variant="outline"
                  size="sm"
                  className="text-sm"
                >
                  Load Example
                </Button>
              </div>
              
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-64 p-4 border rounded-lg font-mono text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300"
                placeholder={`{
  "version": "1.0",
  "metadata": {...},
  "capTable": {...}
}`}
              />

              <Button
                onClick={handleValidate}
                disabled={!jsonInput.trim() || isValidating}
                className="w-full bg-nt84blue hover:bg-nt84bluedarker text-white"
              >
                {isValidating ? 'Validating...' : 'Validate'}
              </Button>

              {/* Validation Results */}
              {validationResult && (
                <Card className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    {validationResult.isValid ? (
                      <>
                        <FaCheckCircle className="text-green-500" size={20} />
                        <span className="font-medium text-green-700 dark:text-green-400">
                          Valid JSON structure
                        </span>
                      </>
                    ) : (
                      <>
                        <FaExclamationTriangle className="text-red-500" size={20} />
                        <span className="font-medium text-red-700 dark:text-red-400">
                          Validation failed
                        </span>
                      </>
                    )}
                  </div>

                  {/* Errors */}
                  {validationResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-700 dark:text-red-400">Errors:</h4>
                      <ul className="space-y-1 text-sm">
                        {validationResult.errors.map((error, idx) => (
                          <li key={idx} className="text-red-600 dark:text-red-400">
                            • {error.field}: {error.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {validationResult.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-yellow-700 dark:text-yellow-400">Warnings:</h4>
                      <ul className="space-y-1 text-sm">
                        {validationResult.warnings.map((warning, idx) => (
                          <li key={idx} className="text-yellow-600 dark:text-yellow-400">
                            • {warning.field}: {warning.message}
                            {warning.suggestion && (
                              <span className="block ml-4 text-xs text-gray-600 dark:text-gray-400">
                                {warning.suggestion}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Summary */}
                  {validationResult.isValid && (
                    <div className="space-y-2 pt-4 border-t dark:border-gray-700">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300">Preview:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>• {validationResult.summary.foundersCount} Founder(s)</div>
                        <div>• {validationResult.summary.safesCount} SAFE(s)</div>
                        <div>• {formatCurrency(validationResult.summary.totalSAFEInvestment)} in SAFEs</div>
                        <div>• {validationResult.summary.seriesInvestorsCount} Series Investor(s)</div>
                        <div className="col-span-2">
                          • {formatCurrency(validationResult.summary.totalSeriesInvestment)} in Series investments
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Import Options */}
              {validationResult?.isValid && (
                <Card className="p-4 space-y-4">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300">Import Options:</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mergeStrategy"
                        value="replace"
                        checked={mergeStrategy === MergeStrategy.Replace}
                        onChange={() => setMergeStrategy(MergeStrategy.Replace)}
                        className="text-nt84blue"
                      />
                      <span className="text-sm">Replace all data</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mergeStrategy"
                        value="merge"
                        checked={mergeStrategy === MergeStrategy.Merge}
                        onChange={() => setMergeStrategy(MergeStrategy.Merge)}
                        className="text-nt84blue"
                      />
                      <span className="text-sm">Merge with existing data</span>
                    </label>
                  </div>
                  
                  {parsedData?.extractionNotes && parsedData.extractionNotes.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                      <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-1">
                        Extraction Notes:
                      </h5>
                      <ul className="text-xs text-yellow-700 dark:text-yellow-500 space-y-1">
                        {parsedData.extractionNotes.map((note, idx) => (
                          <li key={idx}>• {note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {activeTab === 'help' && (
            <div className="prose dark:prose-invert max-w-none">
              <h3>Cap Table Import Schema</h3>
              <p>
                The cap table import format is designed to work with data extracted from Excel files
                or SAFE documents by the companion extraction tool.
              </p>
              
              <h4>Schema Version</h4>
              <p>Current supported versions: 1.0, 1.1</p>
              
              <h4>Basic Structure</h4>
              <pre className="text-xs overflow-x-auto">{`{
  "version": "1.0",
  "metadata": {
    "companyName": "string (optional)",
    "dateGenerated": "ISO 8601 date string",
    "source": "excel" | "documents" | "mixed" | "manual"
  },
  "capTable": {
    "commonStock": [...],
    "options": {...},
    "safes": [...],
    "pricedRounds": [...]
  }
}`}</pre>

              <h4>Common Stock Format</h4>
              <pre className="text-xs overflow-x-auto">{`{
  "holderName": "string",
  "shares": number,
  "vestingSchedule": { // optional
    "cliff": "string",
    "totalVestingPeriod": "string",
    "startDate": "ISO 8601 date"
  }
}`}</pre>

              <h4>SAFE Investment Format</h4>
              <pre className="text-xs overflow-x-auto">{`{
  "investorName": "string",
  "investmentAmount": number,
  "valuationCap": number, // optional for MFN
  "discount": 0-100,
  "conversionType": "post" | "pre" | "mfn",
  "dateExecuted": "ISO 8601 date", // optional
  "sideLetters": ["mfn", "pro-rata"] // optional
}`}</pre>

              <h4>Tips</h4>
              <ul>
                <li>YC SAFEs are automatically detected based on name and cap patterns</li>
                <li>Duplicate detection uses investor name + investment amount</li>
                <li>When merging, new investors are added without replacing existing ones</li>
                <li>Use the "Load Example" button to see a complete valid structure</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t dark:border-gray-700">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!validationResult?.isValid}
            className="bg-nt84blue hover:bg-nt84bluedarker text-white"
          >
            Import Data
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
